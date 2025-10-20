const express = require('express');
const router = express.Router();
const { getDashboardStats, getRecentActivity } = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth.middleware'); // Assuming you have auth middleware

// All routes in this file are protected
router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/recent-activity', getRecentActivity);

module.exports = router;
