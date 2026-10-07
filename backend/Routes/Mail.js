const express = require('express');
const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const { prisma } = require('../config/db');
require('dotenv').config();
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { Webhook } = require('svix');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    const emailBatchPayload = recipients.map(recipient => ({
      from: `Support Team <${senderEmail}>`,
      to: [recipient.email],
      subject: sub,
      text: emailContent
    }));

    const batchResponse = await resend.batch.send(emailBatchPayload);

    if (batchResponse.error) {
      throw new Error(batchResponse.error.message);
    }

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

      await prisma.ticket.update({
        where: { tick_id: tickId },
        data: { status: nextStatus }
      });
    }

    let agentName = 'Helpdesk Support';
    if (effectiveAccountId && isUuid(effectiveAccountId)) {
      const account = await prisma.account.findUnique({
        where: { id: effectiveAccountId },
        select: { name: true }
      });
      if (account?.name) agentName = account.name;
    }

    const subject = `Re: Ticket Support Notification (#${tickId.substring(0, 8)})`;
    const delivery = await sendEmail({
      agentName,
      recipientEmail,
      subject,
      text: replyBodyContent
    });

    if (isUuid(tickId)) {
      await prisma.mail.create({
        data: {
          tick_id: tickId,
          subject,
          sender_email: process.env.SENDER_EMAIL || 'support@urkopvriue.resend.app',
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

// ─────────────────────────────────────────────
// ENDPOINT: Get Ticket Details with Email Thread
// ─────────────────────────────────────────────
router.get('/ticket/:ticketId', async (req, res) => {
  const { ticketId } = req.params;

  if (!isUuid(ticketId)) {
    return res.status(400).json({ success: false, message: 'Invalid Ticket ID format.' });
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { tick_id: ticketId },
      include: {
        mails: {
          orderBy: { sent_at: 'asc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    return res.status(200).json({ success: true, ticket });
  } catch (err) {
    console.error('Error fetching ticket:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Helper function: Keyword heuristic check
function isComplaintEmail(subject = '', content = '') {
  const textToAnalyze = `${subject} ${content}`.toLowerCase();

  const complaintKeywords = [
    'issue', 'complaint', 'problem', 'error', 'failed', 'failure',
    'help', 'support', 'bug', 'refund', 'charge', 'billing', 'cancel',
    'not working', 'broken', 'unable', 'delay', 'urgent', 'dispute',
    'wrong', 'account', 'login', 'payment', 'service update'
  ];

  const ignoreKeywords = [
    'unsubscribe', 'newsletter', 'no-reply', 'noreply', 'promotional',
    'marketing', 'digest', 'weekly updates'
  ];

  const containsIgnoreKeyword = ignoreKeywords.some((kw) => textToAnalyze.includes(kw));
  if (containsIgnoreKeyword) return false;

  return complaintKeywords.some((keyword) => textToAnalyze.includes(keyword));
}

// AI Helper: Classifies email priority and writes draft response
async function analyzeAndDraft(subject, content) {
  const prompt = `
You are an expert customer support AI. Analyze the following incoming email:
Subject: ${subject}
Content: ${content}

Tasks:
1. Determine if this email is a customer support complaint/inquiry (true/false).
2. Assign a priority: LOW, MEDIUM, HIGH, or URGENT.
3. Write a polite, professional draft reply to assist the user.

Return ONLY valid JSON in this exact structure without markdown formatting:
{
  "isComplaint": true,
  "priority": "HIGH",
  "draftReply": "Hello, thank you for reaching out..."
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const responseText = response.text || '';
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('AI Processing Error:', err.message);
    return {
      isComplaint: true,
      priority: 'MEDIUM',
      draftReply: 'Hello, thank you for contacting support. We are reviewing your request.'
    };
  }
}

// ─────────────────────────────────────────────
// ENDPOINT: Inbound Webhook (AI-Powered Ingestion)
// ─────────────────────────────────────────────
router.post('/inbound-webhook', express.json(), async (req, res) => {
  const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;

  if (body.type === 'email.received' || body.type === 'email.incoming') {
    const emailData = body.data;
    const subject = emailData.subject || 'No Subject';
    const content = emailData.text || emailData.html || 'No Content';
    const sender = typeof emailData.from === 'string' ? emailData.from : (emailData.from?.email || emailData.from);
    const recipient = Array.isArray(emailData.to) ? emailData.to[0] : emailData.to;

    // 1. Initial Quick Keyword Check
    const passKeywordFilter = isComplaintEmail(subject, content);
    if (!passKeywordFilter) {
      console.log(`ℹ️ [Webhook Ignored]: Email from ${sender} is not a complaint.`);
      return res.status(200).json({ received: true, status: 'ignored_non_complaint' });
    }

    // 2. Run Gemini AI for Priority & Draft
    console.log(`🤖 Processing incoming email with Gemini AI...`);
    const aiResult = await analyzeAndDraft(subject, content);

    if (!aiResult.isComplaint) {
      console.log(`ℹ️ [AI Ignored]: Gemini flagged email from ${sender} as non-complaint.`);
      return res.status(200).json({ received: true });
    }

    // 3. Create Ticket + Mail + Draft in Database
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
          priority: aiResult.priority || 'MEDIUM',
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
              },
              {
                subject: `Re: ${subject}`,
                sender_email: recipient,
                recipient_email: sender,
                content: aiResult.draftReply,
                email_type: 'approved-draft-placeholder',
                direction: 'OUTGOING'
              }
            ]
          }
        }
      });

      console.log(`✅ [Ticket #${ticket.tick_id}] Created with AI Priority: ${aiResult.priority}`);

      // 4. Send Auto-Acknowledgment via Resend
      if (resend) {
        await resend.emails.send({
          from: process.env.SENDER_EMAIL || 'support@urkopvriue.resend.app',
          to: sender,
          subject: `[Ticket #${ticket.tick_id.slice(0, 8)}] We received your request`,
          html: `<p>Hi there,</p>
           <p>Thank you for reaching out. We have logged your request under Ticket ID: <strong>${ticket.tick_id}</strong>.</p>
           <p>Our support team will review your query and respond shortly.</p>`
        });
        console.log(`✉️ Auto-acknowledgment sent to ${sender}`);
      }
    } catch (err) {
      console.error('❌ PRISMA DB ERROR:', err);
    }
  }

  return res.status(200).json({ received: true });
});

module.exports = router;