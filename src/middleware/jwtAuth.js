const jwt = require('jsonwebtoken');
const config = require('../config');

function jwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Missing or invalid token', code: 'UNAUTHORIZED' } });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.jwtUser = { id: decoded.userId, email: decoded.email };
    next();
  } catch {
    return res.status(401).json({ error: { message: 'Token expired or invalid', code: 'UNAUTHORIZED' } });
  }
}

module.exports = jwtAuth;
