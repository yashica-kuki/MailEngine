const mysql = require('mysql2/promise'); // <-- CRITICAL FIX HERE

const pool = mysql.createPool({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '', 
  database: 'MailEngine',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL on port 3307!');
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error.message);
  }
};

// Make sure you are exporting BOTH pool and connectDB
module.exports = { pool, connectDB };