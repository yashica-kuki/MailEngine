const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
require('dotenv').config();

// ==========================================
// 📊 GET: Fetch Support & AI Analytics Metrics
// ==========================================
router.get('/:accountId', async (req, res) => {
  const { accountId } = req.params;

  if (!accountId) {
    return res.status(400).json({ success: false, message: "Account ID is a required parameter." });
  }

  try {
    // 1. Get total ticket counts and breakdown by status
    const [statusRows] = await pool.execute(`
      SELECT 
        status, 
        COUNT(*) AS count 
      FROM tickets 
      WHERE acc_id = ? 
      GROUP BY status
    `, [accountId]);

    // 2. Get total volume of complaints / tickets logged
    const [totalTicketsRows] = await pool.execute(`
      SELECT COUNT(*) AS totalTickets 
      FROM tickets 
      WHERE acc_id = ?
    `, [accountId]);

    // 3. Get count of AI-generated/assisted responses vs total emails logged
    const [aiMetricRows] = await pool.execute(`
      SELECT 
        SUM(CASE WHEN email_type LIKE '%ai%' OR content LIKE '%AI%' THEN 1 ELSE 0 END) AS aiAssistedCount,
        COUNT(*) AS totalEmails
      FROM mail m
      JOIN tickets t ON m.tick_id = t.tick_id
      WHERE t.acc_id = ?
    `, [accountId]);

    // Format status breakdown into a clean key-value object
    const statusCounts = {
      OPEN: 0,
      IN_PROGRESS: 0,
      PENDING_CUSTOMER: 0,
      RESOLVED: 0,
      CLOSED: 0
    };
    
    statusRows.forEach(row => {
      statusCounts[row.status] = row.count;
    });

    const totalTickets = totalTicketsRows[0].totalTickets || 0;
    const totalEmails = aiMetricRows[0].totalEmails || 0;
    const aiAssistedCount = aiMetricRows[0].aiAssistedCount || 0;

    // Calculate resolution rate percentage safely
    const resolvedCount = (statusCounts['RESOLVED'] || 0) + (statusCounts['CLOSED'] || 0);
    const resolutionRate = totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 0;

    return res.status(200).json({
      success: true,
      analytics: {
        totalTickets,
        statusBreakdown: statusCounts,
        resolutionRate: `${resolutionRate}%`,
        aiAssistedCount,
        totalEmailsProcessed: totalEmails
      }
    });

  } catch (error) {
    console.error("[Analytics Fetch Error]:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;