const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
require('dotenv').config();
const { verifyToken } = require('../middleware/auth');

const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

// ─────────────────────────────────────────────
// GET: Fetch Support & AI Analytics Metrics
// ─────────────────────────────────────────────
router.get('/:accountId', verifyToken, async (req, res) => {
  const { accountId } = req.params;
  const targetAccountId = req.user?.id || accountId;

  const defaultCounts = {
    OPEN: 0,
    IN_PROGRESS: 0,
    PENDING_CUSTOMER: 0,
    RESOLVED: 0,
    CLOSED: 0
  };

  if (!targetAccountId || !isUuid(targetAccountId)) {
    return res.status(200).json({
      success: true,
      analytics: {
        totalTickets: 0,
        statusBreakdown: defaultCounts,
        resolutionRate: '0%',
        aiAssistedCount: 0,
        totalEmailsProcessed: 0
      }
    });
  }

  try {
    // 1. Ticket count broken down by status
    const statusGroups = await prisma.ticket.groupBy({
      by: ['status'],
      where: { acc_id: targetAccountId },
      _count: { status: true }
    });

    // 2. Total ticket count
    const totalTickets = await prisma.ticket.count({
      where: { acc_id: targetAccountId }
    });

    // 3. Total emails logged for this account's tickets
    const totalEmailsProcessed = await prisma.mail.count({
      where: {
        ticket: { acc_id: targetAccountId }
      }
    });

    // 4. AI-assisted count — mails flagged by email_type containing 'ai'
    //    or content containing the word 'AI'
    const aiAssistedCount = await prisma.mail.count({
      where: {
        ticket: { acc_id: targetAccountId },
        OR: [
          { email_type: { contains: 'ai', mode: 'insensitive' } },
          { content: { contains: 'AI' } }
        ]
      }
    });

    // Shape status breakdown into fixed key-value object
    const statusCounts = {
      OPEN: 0,
      IN_PROGRESS: 0,
      PENDING_CUSTOMER: 0,
      RESOLVED: 0,
      CLOSED: 0
    };

    statusGroups.forEach(group => {
      statusCounts[group.status] = group._count.status;
    });

    // Calculate resolution rate
    const resolvedCount = (statusCounts.RESOLVED || 0) + (statusCounts.CLOSED || 0);
    const resolutionRate = totalTickets > 0
      ? Math.round((resolvedCount / totalTickets) * 100)
      : 0;

    return res.status(200).json({
      success: true,
      analytics: {
        totalTickets,
        statusBreakdown: statusCounts,
        resolutionRate: `${resolutionRate}%`,
        aiAssistedCount,
        totalEmailsProcessed
      }
    });

  } catch (error) {
    console.error('[Analytics Fetch Error]:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;