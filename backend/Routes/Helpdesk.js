const express = require('express');
const router = express.Router();
const { Resend } = require('resend');
const { prisma } = require('../config/db');
const { verifyToken } = require('../middleware/auth');
require('dotenv').config();

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

// ─────────────────────────────────────────────
// 1. BACKGROUND ENGINE: Inbox Scraper (Resend API)
// ─────────────────────────────────────────────
async function scanAndLogIncomingComplaints() {
  console.log('[Helpdesk Daemon] Periodic inbox sync initiated...');

  try {
    const fallbackAccount = await prisma.account.findFirst({ select: { id: true } });
    if (!fallbackAccount) {
      console.log('[Helpdesk Daemon] No tenant account found in database. Awaiting account registration.');
      return;
    }
    const fallbackTenantId = fallbackAccount.id;

    // Fetch received emails via Resend API
    const { data: emailsData, error: fetchError } = await resend.emails.list();

    if (fetchError) {
      console.error('[Helpdesk Daemon] Resend fetch error:', fetchError.message);
      return;
    }

    if (!emailsData || !emailsData.data || emailsData.data.length === 0) {
      console.log('[Helpdesk Daemon] No new emails found.');
      return;
    }

    for (const item of emailsData.data) {
      const customerEmail = item.from;
      const customerName = item.from ? item.from.split('<')[0].trim() : 'Valued Customer';
      const emailSubject = item.subject || 'No Subject';
      const emailBody = item.text || item.html || '';

      const keywords = ['complaint', 'broken', 'issue', 'help', 'error', 'fault'];
      const isComplaint = keywords.some(k =>
        emailSubject.toLowerCase().includes(k) || emailBody.toLowerCase().includes(k)
      );

      if (!isComplaint) continue;

      // STEP A: Sync recipient record
      const existingRecipient = await prisma.recipient.findFirst({
        where: { email_add: customerEmail, acc_id: fallbackTenantId }
      });

      if (!existingRecipient) {
        await prisma.recipient.create({
          data: { name: customerName, email_add: customerEmail, acc_id: fallbackTenantId }
        });
      }

      // STEP B: Open a new ticket
      const newTicket = await prisma.ticket.create({
        data: {
          subject: emailSubject,
          status: 'OPEN',
          priority: 'MEDIUM',
          acc_id: fallbackTenantId,
          sender_email: customerEmail
        }
      });

      const activeTicketId = newTicket.tick_id;

      // STEP C: Log inbound email record
      await prisma.mail.create({
        data: {
          tick_id: activeTicketId,
          subject: emailSubject,
          sender_email: customerEmail,
          recipient_email: process.env.SENDER_EMAIL || 'support@yourdomain.com',
          content: emailBody,
          email_type: 'incoming-complaint',
          direction: 'INCOMING'
        }
      });

      // STEP D: Save auto-generated draft response
      const draftAutoReply = `Dear ${customerName},\n\nWe have received your ticket regarding: "${emailSubject}".\n\nYour reference ID is #${String(activeTicketId).substring(0, 8)}. This issue has been logged and is currently under review by our team.`;

      await prisma.mail.create({
        data: {
          tick_id: activeTicketId,
          subject: `Re: ${emailSubject}`,
          sender_email: process.env.SENDER_EMAIL || 'support@yourdomain.com',
          recipient_email: customerEmail,
          content: draftAutoReply,
          email_type: 'approved-draft-placeholder',
          direction: 'OUTGOING'
        }
      });

      console.log(`[Helpdesk Daemon] Ticket created for ${customerEmail} (ID: #${String(activeTicketId).substring(0, 8)})`);
    }

  } catch (err) {
    console.error('[Helpdesk Daemon Critical Error]:', err.message);
  }
}

function initializeInboxWorker() {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Helpdesk Daemon] RESEND_API_KEY not configured. Inbox scraper idle.');
    return;
  }
  const TWO_MINUTES = 2 * 60 * 1000;
  scanAndLogIncomingComplaints().catch(err => console.error('[Helpdesk Daemon Error]:', err.message));
  setInterval(() => {
    scanAndLogIncomingComplaints().catch(err => console.error('[Helpdesk Daemon Error]:', err.message));
  }, TWO_MINUTES);
}

initializeInboxWorker();

// ─────────────────────────────────────────────
// 2. API ENDPOINTS: Helpdesk Services
// ─────────────────────────────────────────────

// PATCH: Update ticket status inline
router.patch('/ticket-status/:tickId', verifyToken, async (req, res) => {
  const { tickId } = req.params;
  const { status } = req.body;

  if (!isUuid(tickId)) {
    return res.status(400).json({ success: false, message: 'Invalid ticket ID format.' });
  }

  const allowedStatuses = ['OPEN', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'RESOLVED', 'CLOSED'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid ticket status.' });
  }

  try {
    await prisma.ticket.update({
      where: { tick_id: tickId },
      data: { status }
    });
    return res.status(200).json({ success: true, message: `Ticket status updated to ${status}` });
  } catch (error) {
    console.error('[Ticket Status Update Error]:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Fetch active unresolved tickets with first incoming-complaint mail body
router.get('/pending/:accountId', verifyToken, async (req, res) => {
  const { accountId } = req.params;
  const targetAccountId = req.user?.id || accountId;

  if (!targetAccountId || !isUuid(targetAccountId)) {
    return res.status(200).json({ success: true, count: 0, tickets: [] });
  }

  try {
    // Fetch all non-resolved tickets, including their first incoming-complaint mail
    const tickets = await prisma.ticket.findMany({
      where: {
        acc_id: targetAccountId,
        status: { notIn: ['RESOLVED', 'CLOSED'] }
      },
      orderBy: { created_at: 'desc' },
      include: {
        mails: {
          where: { email_type: 'incoming-complaint' },
          take: 1,
          orderBy: { mail_id: 'asc' }
        }
      }
    });

    // Shape into the same flat structure the frontend expects
    const shaped = tickets.map(t => ({
      tick_id: t.tick_id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      customer_email: t.sender_email,
      created_at: t.created_at,
      raw_complaint: t.mails[0]?.content ?? null,
      mail_id: t.mails[0]?.mail_id ?? null
    }));

    return res.status(200).json({
      success: true,
      count: shaped.length,
      tickets: shaped
    });

  } catch (error) {
    console.error('[Helpdesk Fetch Error]:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;