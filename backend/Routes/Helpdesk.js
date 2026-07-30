const express = require('express');
const router = express.Router();
const { Resend } = require('resend');
const { pool } = require('../config/db');
require('dotenv').config();

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

// ==========================================
// 🚀 1. BACKGROUND ENGINE: INBOX SCRAPER (RESEND API)
// ==========================================
async function scanAndLogIncomingComplaints() {
  console.log(`[Helpdesk Daemon] Periodic inbox sync initiated...`);
  
  try {
    const fallbackTenantId = '96b0d249-61d6-11f1-adde-e86538d58b3c';

    // 📩 Fetch received emails using Resend API (HTTP instead of IMAP)
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

      // STEP A: Sync Recipient data
      let [recipientRows] = await pool.execute(
        'SELECT receip_id FROM recipients WHERE email_add = ? AND acc_id = ?',
        [customerEmail, fallbackTenantId]
      );

      if (recipientRows.length === 0) {
        await pool.execute(
          'INSERT INTO recipients (name, email_add, acc_id) VALUES (?, ?, ?)',
          [customerName, customerEmail, fallbackTenantId]
        );
      }

      // STEP B: Open a new Ticket
      await pool.execute(
        `INSERT INTO tickets (subject, status, priority, acc_id, sender_email)
         VALUES (?, 'OPEN', 'MEDIUM', ?, ?)`,
        [emailSubject, fallbackTenantId, customerEmail]
      );

      const [ticketRows] = await pool.execute(
        'SELECT tick_id FROM tickets WHERE acc_id = ? ORDER BY tick_id DESC LIMIT 1',
        [fallbackTenantId]
      );
      const activeTicketId = ticketRows[0].tick_id;

      // STEP C: Log inbound email
      await pool.execute(
        `INSERT INTO mail (
          tick_id,
          subject,
          sender_email,
          recipient_email,
          content,
          email_type,
          direction
        ) VALUES (?, ?, ?, ?, ?, 'incoming-complaint', 'INCOMING')`,
        [activeTicketId, emailSubject, customerEmail, process.env.SENDER_EMAIL || 'support@yourdomain.com', emailBody]
      );

      // STEP D: Save draft response
      const draftAutoReply = `Dear ${customerName},\n\nWe have received your ticket regarding: "${emailSubject}".\n\nYour reference ID is #${String(activeTicketId).substring(0, 8)}. This issue has been logged and is currently under review by our team.`;

      await pool.execute(
        `INSERT INTO mail (
          tick_id,
          subject,
          sender_email,
          recipient_email,
          content,
          email_type,
          direction
        ) VALUES (?, ?, ?, ?, ?, 'approved-draft-placeholder', 'OUTGOING')`,
        [activeTicketId, `Re: ${emailSubject}`, process.env.SENDER_EMAIL || 'support@yourdomain.com', customerEmail, draftAutoReply]
      );

      console.log(`[Helpdesk Daemon] Success! Ticket created for ${customerEmail} (ID: #${String(activeTicketId).substring(0, 8)})`);
    }
  } catch (err) {
    console.error('[Helpdesk Daemon Critical Error]:', err.message);
  }
}

function initializeInboxWorker() {
  const TWO_MINUTES = 2 * 60 * 1000;
  scanAndLogIncomingComplaints();
  setInterval(scanAndLogIncomingComplaints, TWO_MINUTES);
}

initializeInboxWorker();

// ==========================================
// 🛣️ 2. API ENDPOINTS: HELP DESK SERVICES
// ==========================================

// PATCH: Update inline ticket status
router.patch('/ticket-status/:tickId', async (req, res) => {
  const { tickId } = req.params;
  const { status } = req.body;

  const allowedStatuses = ['OPEN', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'RESOLVED', 'CLOSED'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid ticket status.' });
  }

  try {
    await pool.execute('UPDATE tickets SET status = ? WHERE tick_id = ?', [status, tickId]);
    return res.status(200).json({ success: true, message: `Ticket status updated to ${status}` });
  } catch (error) {
    console.error('[Ticket Status Update Error]:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Fetch Active unresolved items
router.get('/pending/:accountId', async (req, res) => {
  const { accountId } = req.params;

  if (!accountId) {
    return res.status(400).json({ success: false, message: "Account ID is a required parameter." });
  }

  try {
    const [pendingTickets] = await pool.execute(`
      SELECT 
        t.tick_id,
        t.subject,
        t.status,
        t.priority,
        t.sender_email AS customer_email,
        t.created_at,
        m.content AS raw_complaint,
        m.mail_id
      FROM tickets t
      LEFT JOIN mail m 
        ON t.tick_id = m.tick_id 
       AND m.email_type = 'incoming-complaint'
      WHERE t.acc_id = ?
        AND t.status NOT IN ('RESOLVED', 'CLOSED')
      ORDER BY t.created_at DESC
    `, [accountId]);

    return res.status(200).json({
      success: true,
      count: pendingTickets.length,
      tickets: pendingTickets
    });
  } catch (error) {
    console.error("[Helpdesk Fetch Error]:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;