const express = require('express');
const multer = require('multer');
const authController = require('../controllers/auth.controller');

const router = express.Router();
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;