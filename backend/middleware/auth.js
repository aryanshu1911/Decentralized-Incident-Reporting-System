const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Get token from header
  const token = req.header('Authorization');

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const bearerToken = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
    const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET || 'secret123');

    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
