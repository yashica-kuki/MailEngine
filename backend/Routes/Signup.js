const express = require('express');
const router = express.Router();
const {pool} = require('../config/db'); // Import the raw MySQL pool

// 1. GOOGLE LOGIN (Raw SQL)
router.post('/login', async (req, res) => {
  const { googleId, name, email } = req.body;

  try {
    // Check if google_id exists
    const [rows] = await pool.execute('SELECT * FROM Accounts WHERE google_id = ?', [googleId]);
    let account = rows[0];

    if (!account) {
      // Check if email exists
      const [emailRows] = await pool.execute('SELECT * FROM Accounts WHERE email = ?', [email]);
      account = emailRows[0];

      if (account) {
        // Link Google ID to existing account
        await pool.execute('UPDATE Accounts SET google_id = ? WHERE email = ?', [googleId, email]);
        account.google_id = googleId;
      } else {
        // Brand new insert (MySQL handles UUID generation automatically based on your schema)
        await pool.execute(
          'INSERT INTO Accounts (name, email, google_id, pass) VALUES (?, ?, ?, NULL)',
          [name, email, googleId]
        );
        // Fetch the newly created user to return back
        const [newRows] = await pool.execute('SELECT * FROM Accounts WHERE email = ?', [email]);
        account = newRows[0];
      }
    }

    res.status(200).json({ success: true, user: account });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. TRADITIONAL SIGNUP (Raw SQL)
router.post('/signup', async (req, res) => {
  const { name, email, pass } = req.body;

  if (!name || !email || !pass) {
    return res.status(400).json({ success: false, message: 'Missing fields.' });
  }

  try {
    // Run an insert query. MySQL will supply the default UUID() automatically!
    await pool.execute(
      'INSERT INTO Accounts (name, email, pass) VALUES (?, ?, ?)',
      [name, email, pass]
    );

    res.status(201).json({ success: true, message: `Account created for ${name}!` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;