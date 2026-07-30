const express = require('express');
const router = express.Router();
const imap = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;
const { pool } = require('../config/db');
require('dotenv').config();

// ==========================================
// 🛡️ CONFIGURATION: EMAIL SERVICE PARAMETERS
// ==========================================
const imapConfig = {
  imap: {
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASS,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    authMethods: ['PLAIN', 'LOGIN'],
    tlsOptions: {
      rejectUnauthorized: false,
      servername: 'imap.gmail.com',
      minVersion: 'TLSv1.2'
    },
    keepalive: {
      interval: 10000,
      idleInterval: 30000,
      forceNoop: true
    },
    authTimeout: 30000
  }
};

// ==========================================
// 🚀 1. BACKGROUND ENGINE: INBOX SCRAPER
// ==========================================
async function scanAndLogIncomingComplaints() {
  console.log(`[Helpdesk Daemon] Periodic inbox sync initiated...`);
  let connection;
  try {
    const fallbackTenantId = '96b0d249-61d6-11f1-adde-e86538d58b3c';

    connection = await imap.connect(imapConfig);
    await connection.openBox('INBOX');

    const searchCriteria = ['UNSEEN'];
    const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], markSeen: true };
    const messages = await connection.search(searchCriteria, fetchOptions);

    for (const item of messages) {
      const allParts = item.parts;
      const itemBody = allParts.find(part => part.which === '');
      const parsedEmail = await simpleParser(itemBody.body);

      const customerEmail = parsedEmail.from.value[0].address;
      const customerName = parsedEmail.from.value[0].name || 'Valued Customer';
      const emailSubject = parsedEmail.subject || 'No Subject';
      const emailBody = parsedEmail.text || '';

      const keywords = ['complaint', 'broken', 'issue', 'help', 'error', 'fault'];
      const isComplaint = keywords.some(k => emailSubject.toLowerCase().includes(k) || emailBody.toLowerCase().includes(k));

      if (!isComplaint) continue;

      // STEP A: Sync Recipient data (Changed Recipients -> recipients)
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

      // STEP B: Open a new Ticket (Changed Tickets -> tickets)
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

      // STEP C: Log inbound email (Changed Mail -> mail)
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
        [activeTicketId, emailSubject, customerEmail, process.env.SMTP_USER, emailBody]
      );

      // STEP D: Save draft (Changed Mail -> mail)
      const draftAutoReply = `Dear ${customerName},\n\nWe have received your ticket regarding: "${emailSubject}".\n\nYour reference ID is #${activeTicketId.substring(0, 8)}. This issue has been logged and is currently under review by our team.`;

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
        [activeTicketId, `Re: ${emailSubject}`, process.env.SMTP_USER, customerEmail, draftAutoReply]
      );

      console.log(`[Helpdesk Daemon] Success! Ticket created for ${customerEmail} (ID: #${activeTicketId.substring(0, 8)})`);
    }
  } catch (err) {
    console.error('[Helpdesk Daemon Critical Error]:', err.message);
  } finally {
    if (connection) connection.end();
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
    // Changed Tickets -> tickets
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
    // Changed Tickets -> tickets and Mail -> mail
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