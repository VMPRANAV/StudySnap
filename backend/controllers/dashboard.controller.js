const Quiz = require('../models/quiz.model');
const FlashcardSet = require('../models/flashcardSet.model');
// You will need to create and import the model for quiz attempts.
// Let's assume it's named 'QuizAttempt' and is created when a quiz is submitted.
const QuizAttempt = require('../models/quizAttempt.model');

/**
 * @desc      Get all dashboard stats in one call
 * @route     GET /api/dashboard/stats
 * @access    Private (requires authentication)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // --- 1. Fetch all data in parallel for efficiency ---
    const [
      flashcardSetCount,
      quizCount,
      attempts
    ] = await Promise.all([
      FlashcardSet.countDocuments({ userId }),
      Quiz.countDocuments({ userId }),
      QuizAttempt.find({ userId }).sort({ createdAt: -1 }) // Fetch all attempts
    ]);

    // --- 2. Calculate Statistics ---
    const quizzesTaken = attempts.length;
    let totalScore = 0;
    let totalPossible = 0;
    attempts.forEach(attempt => {
      totalScore += attempt.score;
      totalPossible += attempt.totalQuestions;
    });
    const averageScore = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

    // --- 3. Format Stats for Frontend ---
    const stats = [
      { title: "Quizzes Taken", value: quizzesTaken, icon: "BookOpenIcon", color: "cyan" },
      { title: "Average Score", value: `${averageScore}%`, icon: "CheckCircleIcon", color: "green" },
      { title: "Quizzes Created", value: quizCount, icon: "PlusCircleIcon", color: "purple" },
      { title: "Flashcard Sets", value: flashcardSetCount, icon: "ChartBarIcon", color: "pink" },
    ];
    
    // --- 4. Format Performance Chart Data (e.g., score over time) ---
    // This example groups scores by the last 5 attempts
    const performance = attempts.slice(0, 5).reverse().map((attempt, index) => ({
        label: `Attempt ${attempts.length - 4 + index}`, // Labeling attempts
        value: Math.round((attempt.score / attempt.totalQuestions) * 100)
    }));

    res.status(200).json({
      stats,
      performance
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats.' });
  }
};

/**
 * @desc      Get recent activity (quizzes and flashcards)
 * @route     GET /api/dashboard/recent-activity
 * @access    Private
 */
exports.getRecentActivity = async (req, res) => {
    try {
        const userId = req.user.id;

        const recentQuizzes = await Quiz.find({ userId }).sort({ createdAt: -1 }).limit(3);
        const recentSets = await FlashcardSet.find({ userId }).sort({ createdAt: -1 }).limit(3);

        const quizzes = recentQuizzes.map(q => ({
            id: q._id,
            type: 'quiz',
            topic: q.topic,
            score: `${q.questions.length} questions`,
            time: q.createdAt
        }));

        const flashcards = recentSets.map(s => ({
            id: s._id,
            type: 'flashcards',
            topic: s.topic,
            score: `${s.flashcards.length} cards`,
            time: s.createdAt
        }));

        const recentActivity = [...quizzes, ...flashcards]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 3);
            
        res.status(200).json(recentActivity);

    } catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({ message: 'Failed to fetch recent activity.' });
    }
};
