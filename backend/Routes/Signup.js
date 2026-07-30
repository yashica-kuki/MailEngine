const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); // Import the raw MySQL pool

// 1. LOGIN ROUTE (Supports Google Login & Traditional Password Login)
router.post('/login', async (req, res) => {
  const { googleId, name, email, pass, password } = req.body;
  const userPassword = pass || password;

  try {
    // A. GOOGLE LOGIN FLOW
    if (googleId) {
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required for Google login.' });
      }

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
          // Create new account
          await pool.execute(
            'INSERT INTO Accounts (name, email, google_id, pass) VALUES (?, ?, ?, NULL)',
            [name || 'Google User', email, googleId]
          );
          const [newRows] = await pool.execute('SELECT * FROM Accounts WHERE email = ?', [email]);
          account = newRows[0];
        }
      }

      return res.status(200).json({ success: true, user: account });
    }

    // B. TRADITIONAL EMAIL/PASSWORD LOGIN FLOW
    if (!email || !userPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing credentials. Provide either googleId OR email and password.' 
      });
    }

    const [rows] = await pool.execute('SELECT * FROM Accounts WHERE email = ?', [email]);
    const account = rows[0];

    if (!account) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Compare passwords (In production, use bcrypt.compare here)
    if (account.pass !== userPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    return res.status(200).json({ success: true, user: account });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 2. TRADITIONAL SIGNUP (Raw SQL)
router.post('/signup', async (req, res) => {
  const { name, email, pass, password } = req.body;
  const userPassword = pass || password;

  if (!name || !email || !userPassword) {
    return res.status(400).json({ success: false, message: 'Missing required fields (name, email, pass).' });
  }

  try {
    // Check if account already exists
    const [existing] = await pool.execute('SELECT * FROM Accounts WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Run insert query (MySQL supplies default UUID)
    await pool.execute(
      'INSERT INTO Accounts (name, email, pass) VALUES (?, ?, ?)',
      [name, email, userPassword]
    );

    return res.status(201).json({ success: true, message: `Account created for ${name}!` });
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;