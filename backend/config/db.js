const mysql = require('mysql2/promise'); // <-- CRITICAL FIX HERE
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`Successfully connected to MySQL on port ${process.env.DB_PORT}!`);
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error.message);
  }
};

// Make sure you are exporting BOTH pool and connectDB
module.exports = { pool, connectDB };