const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// --- Configuration ---
// In a real application, this secret should be in a secure config file or environment variable.
const JWT_SECRET = process.env.JWT_SECRET;

// In-memory storage for a single user. This will be null until a user registers.
// NOTE: This is not persistent. The user will be lost if the server restarts.
let userStore = null;


/**
 * @desc      Register a new user
 * @route     POST /api/auth/register
 * @access    Public
 * @note      Allows a single user to be registered in-memory.
 */
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide a username and password.' });
    }

    // Check if a user is already registered in our in-memory store
    if (userStore) {
      return res.status(409).json({ message: 'A user is already registered. Only one user is allowed.' });
    }

    // Create the new user object and store it in memory
    // In a real application, you would hash the password before storing it.
    // e.g., using bcrypt: const hashedPassword = await bcrypt.hash(password, 10);
    userStore = {
        id: crypto.randomUUID(),
        username,
        password, // Storing plain text password for simplicity. DO NOT DO THIS IN PRODUCTION.
        role: 'user'
    };

    res.status(201).json({
      message: 'User registered successfully!',
      data: {
          id: userStore.id,
          username: userStore.username,
      }
    });

  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};


/**
 * @desc      Login a user
 * @route     POST /api/auth/login
 * @access    Public
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Basic validation: Check if username and password were provided.
    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide a username and password.' });
    }
    
    // 2. Check if a user has been registered
    if (!userStore) {
        return res.status(401).json({ message: 'Invalid credentials. No user has been registered.' });
    }

    // 3. Authenticate user: Check if the provided credentials match the stored user.
    const isUsernameMatch = username === userStore.username;
    const isPasswordMatch = password === userStore.password;

    if (!isUsernameMatch || !isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // 4. If credentials are correct, create a JWT.
    const token = jwt.sign(
      { id: userStore.id, role: userStore.role, username: userStore.username },
      JWT_SECRET,
      { expiresIn: '1h' } // Token will expire in 1 hour
    );

    // 5. Send the successful response with the token.
    res.status(200).json({
      status: 'success',
      message: 'Login successful!',
      token,
      data: {
        id: userStore.id,
        username: userStore.username,
        role: userStore.role,
      },
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

