const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

// 1. LOGIN ROUTE
router.post('/login', async (req, res) => {
  const { googleId, name, email, pass, password } = req.body;
  const userPassword = pass || password;

  try {
    // A. GOOGLE LOGIN FLOW
    if (googleId) {
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required for Google login.' });
      }

      const [rows] = await pool.execute('SELECT * FROM accounts WHERE google_id = ?', [googleId]);
      let account = rows[0];

      if (!account) {
        const [emailRows] = await pool.execute('SELECT * FROM accounts WHERE email = ?', [email]);
        account = emailRows[0];

        if (account) {
          await pool.execute('UPDATE accounts SET google_id = ? WHERE email = ?', [googleId, email]);
          account.google_id = googleId;
        } else {
          await pool.execute(
            'INSERT INTO accounts (name, email, google_id, pass) VALUES (?, ?, ?, NULL)',
            [name || 'Google User', email, googleId]
          );
          const [newRows] = await pool.execute('SELECT * FROM accounts WHERE email = ?', [email]);
          account = newRows[0];
        }
      }

      // Remove password hash from response before sending
      delete account.pass;
      return res.status(200).json({ success: true, user: account });
    }

    // B. TRADITIONAL EMAIL/PASSWORD LOGIN FLOW
    if (!email || !userPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing credentials. Provide email and password.' 
      });
    }

    const [rows] = await pool.execute('SELECT * FROM accounts WHERE email = ?', [email]);
    const account = rows[0];

    if (!account || !account.pass) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Password Check
    const isMatch = await bcrypt.compare(userPassword, account.pass);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    delete account.pass;
    return res.status(200).json({ success: true, user: account });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// 2. SIGNUP ROUTE
router.post('/signup', async (req, res) => {
  const { name, email, pass, password } = req.body;
  const userPassword = pass || password;

  if (!name || !email || !userPassword) {
    return res.status(400).json({ success: false, message: 'Missing required fields (name, email, pass).' });
  }

  try {
    const [existing] = await pool.execute('SELECT * FROM accounts WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userPassword, 10);

    await pool.execute(
      'INSERT INTO accounts (name, email, pass) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    return res.status(201).json({ success: true, message: `Account created for ${name}!` });
  } catch (error) {
    console.error("Signup Error:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;