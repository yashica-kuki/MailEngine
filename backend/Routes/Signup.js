// 1. GOOGLE LOGIN / PASSWORD LOGIN
router.post('/login', async (req, res) => {
  const { googleId, name, email, pass, password } = req.body;
  const userPassword = pass || password;

  try {
    if (googleId) {
      // Changed Accounts -> accounts
      const [rows] = await pool.execute('SELECT * FROM accounts WHERE google_id = ?', [googleId]);
      let account = rows[0];

      if (!account) {
        // Changed Accounts -> accounts
        const [emailRows] = await pool.execute('SELECT * FROM accounts WHERE email = ?', [email]);
        account = emailRows[0];

        if (account) {
          // Changed Accounts -> accounts
          await pool.execute('UPDATE accounts SET google_id = ? WHERE email = ?', [googleId, email]);
          account.google_id = googleId;
        } else {
          // Changed Accounts -> accounts
          await pool.execute(
            'INSERT INTO accounts (name, email, google_id, pass) VALUES (?, ?, ?, NULL)',
            [name || 'Google User', email, googleId]
          );
          // Changed Accounts -> accounts
          const [newRows] = await pool.execute('SELECT * FROM accounts WHERE email = ?', [email]);
          account = newRows[0];
        }
      }

      return res.status(200).json({ success: true, user: account });
    }

    if (!email || !userPassword) {
      return res.status(400).json({ success: false, message: 'Missing credentials.' });
    }

    // Changed Accounts -> accounts
    const [rows] = await pool.execute('SELECT * FROM accounts WHERE email = ?', [email]);
    const account = rows[0];

    if (!account) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (account.pass !== userPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    return res.status(200).json({ success: true, user: account });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 2. SIGNUP
router.post('/signup', async (req, res) => {
  const { name, email, pass, password } = req.body;
  const userPassword = pass || password;

  if (!name || !email || !userPassword) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
    // Changed Accounts -> accounts
    const [existing] = await pool.execute('SELECT * FROM accounts WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Changed Accounts -> accounts
    await pool.execute(
      'INSERT INTO accounts (name, email, pass) VALUES (?, ?, ?)',
      [name, email, userPassword]
    );

    return res.status(201).json({ success: true, message: `Account created for ${name}!` });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});