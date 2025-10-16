const jwt = require('jsonwebtoken');

// NOTE: Ensure this secret is the same as the one in your controller and is stored securely.
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * @desc      Middleware to protect routes by verifying JWT.
 * @note      Attaches the decoded user payload to the request object as `req.user`.
 */
exports.protect = (req, res, next) => {
  let token;

  // 1. Check if the 'Authorization' header exists and starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 2. Extract the token from the header (format: "Bearer <token>")
      token = req.headers.authorization.split(' ')[1];

      // 3. Verify the token using your JWT_SECRET
      const decoded = jwt.verify(token, JWT_SECRET);

      // 4. Attach the decoded user information to the request object
      // This makes user data available in any subsequent route handlers
      req.user = decoded; // The payload you signed: { id, role, username }

      // 5. Call next() to pass control to the next middleware in the stack
      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed.' });
    }
  }

  // If no token is found in the header at all
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided.' });
  }
};