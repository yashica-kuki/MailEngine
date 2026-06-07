const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const authRoutes = require('./Routes/Signup'); // Renaming variable to reflect multi-route usage

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json()); 

connectDB();

// Routes
// Using '/auth' as a base path means:
// -> POST http://localhost:3000/auth/signup
// -> POST http://localhost:3000/auth/google-login
app.use('/auth', authRoutes);

app.listen(port, () => {
  console.log(`MailEngine backend listening at http://localhost:${port}`);
});