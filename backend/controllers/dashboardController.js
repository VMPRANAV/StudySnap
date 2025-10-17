const User = require('../models/User');
const Quiz = require('../models/Quiz');
const Flashcard = require('../models/Flashcard');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get quiz statistics
        const quizzes = await Quiz.find({ userId });
        const quizzesTaken = quizzes.length;
        
        // Calculate average score
        let totalScore = 0;
        let scoredQuizzes = 0;
        quizzes.forEach(quiz => {
            if (quiz.results && quiz.results.score !== undefined) {
                totalScore += quiz.results.score;
                scoredQuizzes++;
            }
        });
        const averageScore = scoredQuizzes > 0 ? Math.round(totalScore / scoredQuizzes) : 0;

        // Calculate study time (sum of all quiz durations and flashcard sessions)
        let totalStudyTime = 0;
        quizzes.forEach(quiz => {
            if (quiz.results && quiz.results.duration) {
                totalStudyTime += quiz.results.duration;
            }
        });

        // Get flashcard sets count
        const flashcardSets = await Flashcard.countDocuments({ userId });

        // Format study time
        const studyHours = Math.floor(totalStudyTime / 3600);
        const studyMinutes = Math.floor((totalStudyTime % 3600) / 60);

        res.status(200).json({
            success: true,
            data: {
                stats: [
                    {
                        title: "Quizzes Taken",
                        value: quizzesTaken.toString(),
                        icon: "BookOpenIcon",
                        color: "cyan"
                    },
                    {
                        title: "Average Score",
                        value: `${averageScore}%`,
                        icon: "CheckCircleIcon",
                        color: "green"
                    },
                    {
                        title: "Study Time",
                        value: `${studyHours}h ${studyMinutes}m`,
                        icon: "ClockIcon",
                        color: "purple"
                    },
                    {
                        title: "Flashcard Sets",
                        value: flashcardSets.toString(),
                        icon: "ChartBarIcon",
                        color: "pink"
                    }
                ]
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics',
            error: error.message
        });
    }
};

// @desc    Get recent activity
// @route   GET /api/dashboard/activity
// @access  Private
const getRecentActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;

        // Get recent quizzes
        const recentQuizzes = await Quiz.find({ userId })
            .sort({ completedAt: -1 })
            .limit(limit)
            .select('title results completedAt');

        // Get recent flashcard sessions
        const recentFlashcards = await Flashcard.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('title flashcards createdAt');

        // Combine and sort by date
        const activities = [];

        recentQuizzes.forEach(quiz => {
            activities.push({
                id: quiz._id,
                type: 'quiz',
                topic: quiz.title,
                score: quiz.results 
                    ? `${quiz.results.correctAnswers}/${quiz.results.totalQuestions}`
                    : 'N/A',
                time: getTimeAgo(quiz.completedAt || quiz.createdAt),
                timestamp: quiz.completedAt || quiz.createdAt
            });
        });

        recentFlashcards.forEach(flashcard => {
            activities.push({
                id: flashcard._id,
                type: 'flashcards',
                topic: flashcard.title,
                score: `${flashcard.flashcards.length} cards`,
                time: getTimeAgo(flashcard.createdAt),
                timestamp: flashcard.createdAt
            });
        });

        // Sort by timestamp and limit
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const recentActivity = activities.slice(0, limit).map(({ timestamp, ...rest }) => rest);

        res.status(200).json({
            success: true,
            data: recentActivity
        });

    } catch (error) {
        console.error('Recent activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching recent activity',
            error: error.message
        });
    }
};

// @desc    Get performance data
// @route   GET /api/dashboard/performance
// @access  Private
const getPerformance = async (req, res) => {
    try {
        const userId = req.user.id;
        const months = 5; // Last 5 months

        // Get current date
        const now = new Date();
        const performance = [];

        // Calculate performance for each month
        for (let i = months - 1; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

            // Get quizzes for this month
            const monthQuizzes = await Quiz.find({
                userId,
                completedAt: {
                    $gte: monthDate,
                    $lt: nextMonthDate
                }
            });

            // Calculate average score for the month
            let totalScore = 0;
            let count = 0;
            monthQuizzes.forEach(quiz => {
                if (quiz.results && quiz.results.score !== undefined) {
                    totalScore += quiz.results.score;
                    count++;
                }
            });

            const avgScore = count > 0 ? Math.round(totalScore / count) : 0;

            performance.push({
                label: monthDate.toLocaleString('en-US', { month: 'short' }),
                value: avgScore
            });
        }

        res.status(200).json({
            success: true,
            data: performance
        });

    } catch (error) {
        console.error('Performance data error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching performance data',
            error: error.message
        });
    }
};

// @desc    Get complete dashboard data
// @route   GET /api/dashboard
// @access  Private
const getDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password');

        // Get all dashboard data
        const statsPromise = getDashboardStatsData(userId);
        const activityPromise = getRecentActivityData(userId, 5);
        const performancePromise = getPerformanceData(userId, 5);

        const [stats, recentActivity, performance] = await Promise.all([
            statsPromise,
            activityPromise,
            performancePromise
        ]);

        res.status(200).json({
            success: true,
            data: {
                userName: user.username || user.name || 'User',
                stats,
                recentActivity,
                performance
            }
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data',
            error: error.message
        });
    }
};

// Helper functions
const getDashboardStatsData = async (userId) => {
    const quizzes = await Quiz.find({ userId });
    const quizzesTaken = quizzes.length;
    
    let totalScore = 0;
    let scoredQuizzes = 0;
    let totalStudyTime = 0;
    
    quizzes.forEach(quiz => {
        if (quiz.results && quiz.results.score !== undefined) {
            totalScore += quiz.results.score;
            scoredQuizzes++;
        }
        if (quiz.results && quiz.results.duration) {
            totalStudyTime += quiz.results.duration;
        }
    });
    
    const averageScore = scoredQuizzes > 0 ? Math.round(totalScore / scoredQuizzes) : 0;
    const flashcardSets = await Flashcard.countDocuments({ userId });
    const studyHours = Math.floor(totalStudyTime / 3600);
    const studyMinutes = Math.floor((totalStudyTime % 3600) / 60);

    return [
        { title: "Quizzes Taken", value: quizzesTaken.toString(), icon: "BookOpenIcon", color: "cyan" },
        { title: "Average Score", value: `${averageScore}%`, icon: "CheckCircleIcon", color: "green" },
        { title: "Study Time", value: `${studyHours}h ${studyMinutes}m`, icon: "ClockIcon", color: "purple" },
        { title: "Flashcard Sets", value: flashcardSets.toString(), icon: "ChartBarIcon", color: "pink" }
    ];
};

const getRecentActivityData = async (userId, limit) => {
    const recentQuizzes = await Quiz.find({ userId })
        .sort({ completedAt: -1 })
        .limit(limit)
        .select('title results completedAt createdAt');

    const recentFlashcards = await Flashcard.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('title flashcards createdAt');

    const activities = [];

    recentQuizzes.forEach(quiz => {
        activities.push({
            id: quiz._id,
            type: 'quiz',
            topic: quiz.title,
            score: quiz.results 
                ? `${quiz.results.correctAnswers}/${quiz.results.totalQuestions}`
                : 'N/A',
            time: getTimeAgo(quiz.completedAt || quiz.createdAt),
            timestamp: quiz.completedAt || quiz.createdAt
        });
    });

    recentFlashcards.forEach(flashcard => {
        activities.push({
            id: flashcard._id,
            type: 'flashcards',
            topic: flashcard.title,
            score: `${flashcard.flashcards.length} cards`,
            time: getTimeAgo(flashcard.createdAt),
            timestamp: flashcard.createdAt
        });
    });

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return activities.slice(0, limit).map(({ timestamp, ...rest }) => rest);
};

const getPerformanceData = async (userId, months) => {
    const now = new Date();
    const performance = [];

    for (let i = months - 1; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const monthQuizzes = await Quiz.find({
            userId,
            completedAt: { $gte: monthDate, $lt: nextMonthDate }
        });

        let totalScore = 0;
        let count = 0;
        monthQuizzes.forEach(quiz => {
            if (quiz.results && quiz.results.score !== undefined) {
                totalScore += quiz.results.score;
                count++;
            }
        });

        const avgScore = count > 0 ? Math.round(totalScore / count) : 0;
        performance.push({
            label: monthDate.toLocaleString('en-US', { month: 'short' }),
            value: avgScore
        });
    }

    return performance;
};

// Utility function to format time ago
const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + "y ago";
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + "mo ago";
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + "d ago";
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + "h ago";
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + "m ago";
    
    return "just now";
};

module.exports = {
    getDashboard,
    getDashboardStats,
    getRecentActivity,
    getPerformance
};