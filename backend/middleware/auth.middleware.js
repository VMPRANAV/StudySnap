const jwt = require('jsonwebtoken');

// NOTE: Ensure this secret is the same as the one in your controller and is stored securely.
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * @desc      Middleware to protect routes by verifying JWT.
 * @note      Attaches the decoded user payload to the request object as `req.user`.
 */
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      username: decoded.username
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};