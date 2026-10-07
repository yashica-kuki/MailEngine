const express = require('express');
const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const { prisma } = require('../config/db');
require('dotenv').config();
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { Webhook } = require('svix');

// Initialize Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Initialize optional SMTP transporter
let smtpTransporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

/**
 * Unified email sender with SMTP fallback and detailed error categorization
 */
async function sendEmail({ agentName, recipientEmail, subject, text }) {
  // Option A: Custom SMTP via Nodemailer
  if (smtpTransporter) {
    try {
      const fromAddr = process.env.SMTP_FROM || `"${agentName}" <${process.env.SMTP_USER}>`;
      const info = await smtpTransporter.sendMail({
        from: fromAddr,
        to: recipientEmail,
        subject,
        text,
      });
      return { provider: 'smtp', id: info.messageId };
    } catch (smtpErr) {
      console.error('[SMTP Send Error]:', smtpErr.message);
      if (!resend) throw new Error(`SMTP dispatch failed: ${smtpErr.message}`);
      console.log('[Mailer] Falling back to Resend API...');
    }
  }

  // Option B: Resend API
  if (!resend) {
    throw new Error('No email transport configured. Please configure RESEND_API_KEY or SMTP credentials in .env.');
  }

  const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
  const from = senderEmail.includes('<') ? senderEmail : `${agentName} <${senderEmail}>`;

  const data = await resend.emails.send({
    from,
    to: [recipientEmail],
    subject,
    text,
  });

  if (data.error) {
    const errMsg = data.error.message || 'Resend error';
    if (errMsg.includes('only send testing emails')) {
      throw new Error(`Resend Sandbox restriction: You can only send testing emails to your registered account email. To send to '${recipientEmail}', please verify a domain at resend.com/domains or configure SMTP credentials in .env.`);
    }
    throw new Error(errMsg);
  }

  return { provider: 'resend', id: data.data.id };
}

// ─────────────────────────────────────────────
// ENDPOINT 1: Email Campaign Dispatch (Bulk / Single)
// ─────────────────────────────────────────────
router.post('/fetch', verifyToken, async (req, res) => {
  const { accountId, recipientEmail, tickId, sub, subject: altSub, emailContent, content: altContent } = req.body;
  const effectiveSubject = sub || altSub;
  const effectiveContent = emailContent || altContent;
  const effectiveAccountId = req.user?.id || accountId;

  if (!recipientEmail || !effectiveSubject || !effectiveContent) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: recipientEmail, subject, and emailContent are required.'
    });
  }

  try {
    let agentName = 'Support Team';
    if (effectiveAccountId && isUuid(effectiveAccountId)) {
      const account = await prisma.account.findUnique({
        where: { id: effectiveAccountId },
        select: { name: true }
      });
      if (account?.name) agentName = account.name;
    }

    // Dispatch email
    const delivery = await sendEmail({
      agentName,
      recipientEmail,
      subject: effectiveSubject,
      text: effectiveContent
    });

    // Sync recipient to PostgreSQL if tenant account is known
    if (effectiveAccountId && isUuid(effectiveAccountId)) {
      try {
        const existingRecipient = await prisma.recipient.findFirst({
          where: { email_add: recipientEmail, acc_id: effectiveAccountId }
        });
        if (!existingRecipient) {
          await prisma.recipient.create({
            data: {
              email_add: recipientEmail,
              acc_id: effectiveAccountId
            }
          });
        }
      } catch (dbErr) {
        console.warn('[Campaign Recipient DB Sync Warning]:', dbErr.message);
      }
    }

    console.log(`[Mail Engine] Campaign email dispatched to ${recipientEmail} (${delivery.provider}: ${delivery.id})`);
    return res.status(200).json({
      success: true,
      message: 'Email dispatched successfully',
      messageId: delivery.id,
      provider: delivery.provider
    });

  } catch (error) {
    console.error('[Mail Engine Error]:', error.message);
    const isSandboxError = error.message.includes('Resend Sandbox') || error.message.includes('only send testing emails');
    // Use 422 for Resend sandbox domain restriction (not 403, which looks like auth failure)
    return res.status(isSandboxError ? 422 : 500).json({
      success: false,
      message: isSandboxError
        ? `Email delivery blocked: ${error.message}`
        : error.message,
      error: error.message,
      sandboxError: isSandboxError
    });
  }
});

// ─────────────────────────────────────────────
// ENDPOINT: Bulk Batch Campaign Dispatch
// ─────────────────────────────────────────────
router.post('/batch-fetch', verifyToken, async (req, res) => {
  const { accountId, recipients, sub, emailContent } = req.body;
  const effectiveAccountId = req.user?.id || accountId;

  if (!Array.isArray(recipients) || recipients.length === 0 || !sub || !emailContent) {
    return res.status(400).json({
      success: false,
      message: 'Recipients list, subject, and emailContent are required.'
    });
  }

  try {
    const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

    // Construct batch array for Resend API
    const emailBatchPayload = recipients.map(recipient => ({
      from: `Support Team <${senderEmail}>`,
      to: [recipient.email],
      subject: sub,
      text: emailContent
    }));

    // 🚀 Send all emails in a single HTTP payload
    const batchResponse = await resend.batch.send(emailBatchPayload);

    if (batchResponse.error) {
      throw new Error(batchResponse.error.message);
    }

    // Non-blocking database sync for recipient records
    if (effectiveAccountId && isUuid(effectiveAccountId)) {
      Promise.allSettled(
        recipients.map(r =>
          prisma.recipient.upsert({
            where: { email_add_acc_id: { email_add: r.email, acc_id: effectiveAccountId } },
            update: {},
            create: { email_add: r.email, acc_id: effectiveAccountId }
          })
        )
      ).catch(err => console.warn('[Batch DB Sync Warning]:', err.message));
    }

    return res.status(200).json({
      success: true,
      message: `Batch campaign dispatched to ${recipients.length} recipients.`,
      data: batchResponse.data
    });

  } catch (error) {
    console.error('[Batch Mail Engine Error]:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// ENDPOINT 2: Helpdesk Ticket Approval & Reply
// ─────────────────────────────────────────────
router.post('/approve-ticket', verifyToken, async (req, res) => {
  const { tickId, accountId, recipientEmail, replyBodyContent, nextStatus } = req.body;
  const allowedStatuses = ['PENDING_CUSTOMER', 'RESOLVED', 'CLOSED', 'IN_PROGRESS'];
  const effectiveAccountId = req.user?.id || accountId;

  if (!tickId || !replyBodyContent || !nextStatus || !recipientEmail) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: tickId, recipientEmail, replyBodyContent, and nextStatus are required.'
    });
  }

  if (!allowedStatuses.includes(nextStatus)) {
    return res.status(400).json({ success: false, message: 'Invalid nextStatus enum value.' });
  }

  try {
    // 1. Upsert the approved-draft-placeholder record for this ticket if tickId is valid UUID
    if (isUuid(tickId)) {
      const existingDraft = await prisma.mail.findFirst({
        where: { tick_id: tickId, email_type: 'approved-draft-placeholder' }
      });

      if (existingDraft) {
        await prisma.mail.update({
          where: { mail_id: existingDraft.mail_id },
          data: { content: replyBodyContent }
        });
      } else {
        await prisma.mail.create({
          data: {
            tick_id: tickId,
            content: replyBodyContent,
            email_type: 'approved-draft-placeholder',
            direction: 'OUTGOING'
          }
        });
      }

      // 2. Update the ticket status
      await prisma.ticket.update({
        where: { tick_id: tickId },
        data: { status: nextStatus }
      });
    }

    // 3. Resolve sender agent name
    let agentName = 'Helpdesk Support';
    if (effectiveAccountId && isUuid(effectiveAccountId)) {
      const account = await prisma.account.findUnique({
        where: { id: effectiveAccountId },
        select: { name: true }
      });
      if (account?.name) agentName = account.name;
    }

    // 4. Dispatch email
    const subject = `Re: Ticket Resolution Support Notification (#${tickId.substring(0, 8)})`;
    const delivery = await sendEmail({
      agentName,
      recipientEmail,
      subject,
      text: replyBodyContent
    });

    // 5. Log the outgoing support-reply record if tickId is valid UUID
    if (isUuid(tickId)) {
      await prisma.mail.create({
        data: {
          tick_id: tickId,
          subject,
          sender_email: process.env.SENDER_EMAIL || 'support@mailengine.dev',
          recipient_email: recipientEmail,
          content: replyBodyContent,
          email_type: 'support-reply',
          direction: 'OUTGOING'
        }
      });
    }

    console.log(`[Helpdesk Engine] Email relayed to ${recipientEmail} | MessageID: ${delivery.id}`);
    return res.status(200).json({ success: true, message: 'Ticket processed and email sent successfully!' });

  } catch (error) {
    console.error('[Mail Approval Engine Critical Error]:', error.message);
    return res.status(500).json({ success: false, message: error.message, error: error.message });
  }
});

// Helper function: Checks if email subject or content indicates a complaint/support inquiry
function isComplaintEmail(subject = '', content = '') {
  const textToAnalyze = `${subject} ${content}`.toLowerCase();

  // Primary keywords indicating support complaints, issues, or inquiries
  const complaintKeywords = [
    'issue', 'complaint', 'problem', 'error', 'failed', 'failure',
    'help', 'support', 'bug', 'refund', 'charge', 'billing', 'cancel',
    'not working', 'broken', 'unable', 'delay', 'urgent', 'dispute',
    'wrong', 'account', 'login', 'payment', 'service update'
  ];

  // Common non-complaint / automated keywords to skip
  const ignoreKeywords = [
    'unsubscribe', 'newsletter', 'no-reply', 'noreply', 'promotional',
    'marketing', 'digest', 'weekly updates'
  ];

  // If email explicitly contains unsubscribe/newsletter markers, ignore it
  const containsIgnoreKeyword = ignoreKeywords.some((kw) => textToAnalyze.includes(kw));
  if (containsIgnoreKeyword) return false;

  // Check if at least one complaint keyword exists
  return complaintKeywords.some((keyword) => textToAnalyze.includes(keyword));
}

// ─────────────────────────────────────────────
// ENDPOINT: Inbound Webhook (Filter Complaints Only)
// ─────────────────────────────────────────────
router.post('/inbound-webhook', express.json(), async (req, res) => {
  const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;

  if (body.type === 'email.received' || body.type === 'email.incoming') {
    const emailData = body.data;
    const subject = emailData.subject || 'No Subject';
    const content = emailData.text || emailData.html || 'No Content';
    const sender = typeof emailData.from === 'string' ? emailData.from : (emailData.from?.email || emailData.from);
    const recipient = Array.isArray(emailData.to) ? emailData.to[0] : emailData.to;

    // 1. Run Complaint Filter
    const isComplaint = isComplaintEmail(subject, content);

    if (!isComplaint) {
      console.log(`ℹ️ [Webhook Ignored]: Email from ${sender} with subject "${subject}" is not a complaint.`);
      return res.status(200).json({ received: true, status: 'ignored_non_complaint' });
    }

    // 2. Create Ticket & Mail if it passes the filter
    try {
      const account = await prisma.account.findFirst();

      if (!account) {
        console.error('❌ FAILED: No user account found in PostgreSQL!');
        return res.status(200).json({ received: true });
      }

      const ticket = await prisma.ticket.create({
        data: {
          acc_id: account.id,
          subject: subject,
          status: 'OPEN',
          priority: 'MEDIUM',
          sender_email: sender,
          mails: {
            create: [
              {
                subject: subject,
                sender_email: sender,
                recipient_email: recipient,
                content: content,
                email_type: 'incoming-complaint',
                direction: 'INCOMING'
              }
            ]
          }
        }
      });

      console.log(`✅ [Complaint Logged]: Ticket #${ticket.tick_id} created for "${subject}"`);
    } catch (err) {
      console.error('❌ PRISMA DB ERROR:', err);
    }
  }

  return res.status(200).json({ received: true });
});

module.exports = router;