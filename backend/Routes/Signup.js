const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { prisma } = require('../config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mailengine-jwt-fallback-secret-2026';

// ─────────────────────────────────────────────
// 1. LOGIN ROUTE (Public)
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { googleId, name, email, pass, password } = req.body;
  const userPassword = pass || password;

  try {
    // ── A. GOOGLE LOGIN FLOW ──────────────────
    if (googleId) {
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required for Google login.' });
      }

      let account = await prisma.account.findFirst({ where: { google_id: googleId } });

      if (!account) {
        account = await prisma.account.findUnique({ where: { email } });

        if (account) {
          account = await prisma.account.update({
            where: { email },
            data: { google_id: googleId }
          });
        } else {
          account = await prisma.account.create({
            data: { name: name || 'Google User', email, google_id: googleId, pass: null }
          });
        }
      }

      // Generate JWT Token for Google Login
      const token = jwt.sign({ id: account.id, email: account.email }, JWT_SECRET, { expiresIn: '7d' });
      const { pass: _pass, ...safeAccount } = account;
      return res.status(200).json({ success: true, token, user: safeAccount });
    }

    // ── B. TRADITIONAL EMAIL / PASSWORD FLOW ─
    if (!email || !userPassword) {
      return res.status(400).json({ success: false, message: 'Missing credentials. Provide email and password.' });
    }

    const account = await prisma.account.findUnique({ where: { email } });
    if (!account || !account.pass) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(userPassword, account.pass);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    console.log("Account ID:", account.id);
    console.log("JWT_SECRET value:", JWT_SECRET);

    // ✅ FIX: Generate JWT Token for Email/Password Login!
    const token = jwt.sign(
      { id: account.id, email: account.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log("Generated Token Successfully:", token);

    const { pass: _pass, ...safeAccount } = account;

    // Return token directly in the JSON response payload
    return res.status(200).json({
      success: true,
      token,
      user: safeAccount
    });

  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─────────────────────────────────────────────
// 2. SIGNUP ROUTE (Public)
// ─────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { name, email, pass, password } = req.body;
  const userPassword = pass || password;

  if (!name || !email || !userPassword) {
    return res.status(400).json({ success: false, message: 'Missing required fields (name, email, pass).' });
  }

  try {
    const existing = await prisma.account.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(userPassword, 10);
    await prisma.account.create({ data: { name, email, pass: hashedPassword } });

    return res.status(201).json({ success: true, message: `Account created for ${name}!` });

  } catch (error) {
    console.error('Signup Error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;