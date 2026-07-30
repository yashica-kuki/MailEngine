const express = require('express');
const { Resend } = require('resend');
const { pool } = require('../config/db');
require('dotenv').config();
const router = express.Router();

// Initialize Resend with your environment variable
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * 📦 SHARED CORE MAILER SERVICE USING RESEND
 */
async function sendEmailViaResend({ agentName, recipientEmail, subject, text }) {
  const data = await resend.emails.send({
    from: `${agentName} <onboarding@resend.dev>`,
    to: [recipientEmail],
    subject: subject,
    text: text,
  });
  
  if (data.error) {
    throw new Error(data.error.message);
  }
  
  return data.data.id;
}

// ========================================================
// 🚀 ENDPOINT 1: FOR BULK EMAIL CAMPAIGN GENERATOR DASHBOARD
// ========================================================
router.post('/fetch', async (req, res) => {
  const { accountId, recipientEmail, tickId, sub, emailContent } = req.body;

  if (!accountId || !recipientEmail || !tickId || !sub || !emailContent) {
    return res.status(400).json({ success: false, message: "Missing required tracking parameters." });
  }

  try {
    const [accountRows] = await pool.execute('SELECT name FROM accounts WHERE id = ?', [accountId]);
    const agentName = accountRows[0]?.name || "Support Team";

    const messageId = await sendEmailViaResend({
      agentName,
      recipientEmail,
      subject: sub,
      text: emailContent
    });

    console.log(`[Resend Engine] Bulk Campaign item dispatched successfully for Ticket #${tickId}.`);
    return res.status(200).json({ success: true, messageId });
  } catch (error) {
    console.error("[Resend Engine Error]:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================
// 🎯 ENDPOINT 2: FOR HELPDESK SYSTEM APPROVAL ACTION DASHBOARD
// ========================================================
router.post('/approve-ticket', async (req, res) => {
  const { tickId, accountId, recipientEmail, replyBodyContent, nextStatus } = req.body;
  const allowedStatuses = ['PENDING_CUSTOMER', 'RESOLVED', 'CLOSED', 'IN_PROGRESS'];

  // Validation
  if (!tickId || !replyBodyContent || !nextStatus || !recipientEmail || !accountId) {
    return res.status(400).json({
      success: false,
      message: "Missing required parameters: tickId, accountId, recipientEmail, replyBodyContent, or nextStatus."
    });
  }

  if (!allowedStatuses.includes(nextStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid targeted nextStatus enum code value."
    });
  }

  try {
    // 1. Manage the placeholder draft tracking states
    const [existingDrafts] = await pool.execute(
      "SELECT * FROM mail WHERE tick_id = ? AND email_type = 'approved-draft-placeholder'",
      [tickId]
    );

    if (existingDrafts.length > 0) {
      await pool.execute(
        "UPDATE mail SET content = ? WHERE tick_id = ? AND email_type = 'approved-draft-placeholder'",
        [replyBodyContent, tickId]
      );
    } else {
      await pool.execute(
        "INSERT INTO mail (tick_id, content, email_type) VALUES (?, ?, 'approved-draft-placeholder')",
        [tickId, replyBodyContent]
      );
    }

    // 2. Safely shift the ticket's active operational state status
    await pool.execute("UPDATE tickets SET status = ? WHERE tick_id = ?", [nextStatus, tickId]);

    const [accountRows] = await pool.execute('SELECT name FROM accounts WHERE id = ?', [accountId]);
    const agentName = accountRows[0]?.name || "Helpdesk Support";

    // 3. Dispatch out using Resend
    const messageId = await sendEmailViaResend({
      agentName,
      recipientEmail,
      subject: `Re: Ticket Resolution Support Notification (#${tickId.substring(0, 8)})`,
      text: replyBodyContent
    });

    // Log row record data accurately in history database matrices
    await pool.execute(
      `INSERT INTO mail (
          tick_id,
          subject,
          sender_email,
          recipient_email,
          content,
          email_type,
          direction,
          sent_at
       ) VALUES (?, ?, ?, ?, ?, 'support-reply', 'OUTGOING', NOW())`,
      [
        tickId,
        `Re: Ticket Resolution Support Notification (#${tickId.substring(0, 8)})`,
        'onboarding@resend.dev',
        recipientEmail,
        replyBodyContent
      ]
    );

    console.log(`[Resend Engine] Email successfully relayed to ${recipientEmail} | MessageID: ${messageId}`);
    return res.status(200).json({ success: true, message: "Ticket processed and email sent successfully!" });
    
  } catch (error) {
    console.error("[Mail Approval Engine Critical Error]:", error.message);
    return res.status(500).json({ success: false, message: "Mail delivery system exception dropped.", error: error.message });
  }
});

module.exports = router;