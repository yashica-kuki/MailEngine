const express = require('express');
const nodemailer = require("nodemailer");
const { pool } = require('../config/db');
require('dotenv').config();
const router = express.Router();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS, 
  },
});

/**
 * 📦 SHARED CORE MAILER SERVICE
 */
async function sendEmailViaSMTP({ agentName, recipientEmail, subject, text }) {
  const info = await transporter.sendMail({
    from: `"${agentName}" <${process.env.SMTP_USER}>`, 
    to: recipientEmail,
    subject: subject,
    text: text,
  });
  return info.messageId;
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
    const [accountRows] = await pool.execute('SELECT name FROM Accounts WHERE id = ?', [accountId]);
    const agentName = accountRows[0]?.name || "Support Team";

    const messageId = await sendEmailViaSMTP({
      agentName,
      recipientEmail,
      subject: sub,
      text: emailContent
    });

    console.log(`[SMTP Engine] Bulk Campaign item dispatched successfully for Ticket #${tickId}.`);
    return res.status(200).json({ success: true, messageId });
  } catch (error) {
    console.error("[SMTP Engine Error]:", error.message);
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
      "SELECT * FROM Mail WHERE tick_id = ? AND email_type = 'approved-draft-placeholder'",
      [tickId]
    );

    if (existingDrafts.length > 0) {
      await pool.execute(
        "UPDATE Mail SET content = ? WHERE tick_id = ? AND email_type = 'approved-draft-placeholder'",
        [replyBodyContent, tickId]
      );
    } else {
      await pool.execute(
        "INSERT INTO Mail (tick_id, content, email_type) VALUES (?, ?, 'approved-draft-placeholder')",
        [tickId, replyBodyContent]
      );
    }

    // 2. Safely shift the ticket's active operational state status enum configuration code
    await pool.execute("UPDATE Tickets SET status = ? WHERE tick_id = ?", [nextStatus, tickId]);

    const [accountRows] = await pool.execute('SELECT name FROM Accounts WHERE id = ?', [accountId]);
    const agentName = accountRows[0]?.name || "Helpdesk Support";

    // 3. Dispatch out to your customer using Nodemailer
    const messageId = await sendEmailViaSMTP({
      agentName,
      recipientEmail,
      subject: `Re: Ticket Resolution Support Notification (#${tickId.substring(0, 8)})`,
      text: replyBodyContent
    });

    // ✅ FIXED: Log row record data accurately in history database matrices inside functional scope!
    await pool.execute(
      `INSERT INTO Mail (
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
        process.env.SMTP_USER,
        recipientEmail,
        replyBodyContent
      ]
    );

    console.log(`[MailEngine] Email successfully relayed to ${recipientEmail} | MessageID: ${messageId}`);
    return res.status(200).json({ success: true, message: "Ticket processed and email sent successfully!" });
    
  } catch (error) {
    console.error("[Mail Approval Engine Critical Error]:", error.message);
    return res.status(500).json({ success: false, message: "Mail delivery system exception dropped.", error: error.message });
  }
});

module.exports = router;