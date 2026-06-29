const express = require('express');
const multer = require('multer');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/ai-warmup', protect, authController.warmAi);

module.exports = router;
