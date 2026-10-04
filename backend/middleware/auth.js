const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mailengine-jwt-fallback-secret-2026';

/**
 * Middleware to authenticate requests using JWT Bearer tokens
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ success: false, message: 'Access denied. Please log in to continue.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired. Please log in again.' });
    }
    return res.status(403).json({ success: false, message: 'Invalid authentication token.' });
  }
};

module.exports = { verifyToken, JWT_SECRET };
