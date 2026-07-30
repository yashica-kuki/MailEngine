const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const authRoutes = require('./Routes/Signup');
const mailRoutes = require('./Routes/Mail');
const helpdeskRoutes = require('./Routes/Helpdesk');
const analyticsRoutes = require('./Routes/Analytics');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*', 
  credentials: true
}));

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Connect to Database
connectDB();

// Root test route
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'MailEngine backend is running.' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/mail', mailRoutes);
app.use('/helpdesk', helpdeskRoutes);
app.use('/api/analytics', analyticsRoutes);

app.listen(port, () => {
  console.log(`MailEngine backend listening on port ${port}`);
});