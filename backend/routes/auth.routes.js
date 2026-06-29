const express = require('express');
const multer = require('multer');
const authController = require('../controllers/auth.controller');
const { protect, protectCron } = require('../middleware/auth.middleware');

const router = express.Router();
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/ai-warmup', protect, authController.warmAi);
router.get('/ai-warmup/cron', protectCron, authController.cronWarmAi);

module.exports = router;
