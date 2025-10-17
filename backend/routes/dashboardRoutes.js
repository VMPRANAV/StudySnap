const express = require('express');
const router = express.Router();
const {
    getDashboard,
    getDashboardStats,
    getRecentActivity,
    getPerformance
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Get complete dashboard data
router.get('/', getDashboard);

// Get individual dashboard sections
router.get('/stats', getDashboardStats);
router.get('/activity', getRecentActivity);
router.get('/performance', getPerformance);

module.exports = router;