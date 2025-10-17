const mongoose = require('mongoose');
const Quiz = require('../models/quiz.model');
const QuizAttempt = require('../models/quizAttempt.model'); 

class QuizService {
  static async calculateAndSaveScore(quizId, userId, userAnswers) {
    try {
      // Validate inputs
      if (!quizId || !mongoose.Types.ObjectId.isValid(quizId)) {
        throw new Error("Invalid quiz ID format.");
      }

      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid user ID format.");
      }

      if (!Array.isArray(userAnswers) || userAnswers.length === 0) {
        throw new Error("Invalid or empty answers array.");
      }

      // Step 1: Fetch the original quiz to get the correct answers
      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        throw new Error("Quiz not found.");
      }

      // Verify quiz belongs to user (optional - depends on requirements)
      // if (quiz.userId.toString() !== userId) {
      //   throw new Error("Unauthorized: Quiz does not belong to this user.");
      // }

      console.log('Found quiz:', quiz.topic, 'with', quiz.questions.length, 'questions');

      // Step 2: Calculate the score
      let score = 0;
      const totalQuestions = quiz.questions.length;

      // Validate that user answered all questions
      if (userAnswers.length !== totalQuestions) {
        console.warn(`User answered ${userAnswers.length} questions but quiz has ${totalQuestions} questions`);
      }

      quiz.questions.forEach((question, index) => {
        const userAnswer = userAnswers.find(ans => ans.questionIndex === index);
        if (userAnswer && userAnswer.selectedAnswerIndex === question.correctAnswerIndex) {
          score++;
        }
      });

      console.log('Calculated score:', score, 'out of', totalQuestions);

      // Step 3: Create a new QuizAttempt document
      const newAttempt = new QuizAttempt({
        quizId: new mongoose.Types.ObjectId(quizId),
        userId: new mongoose.Types.ObjectId(userId),
        answers: userAnswers,
        score,
        totalQuestions,
      });

      // Step 4: Save the attempt to the database
      await newAttempt.save();

      console.log('Saved quiz attempt with ID:', newAttempt._id);

      // Step 5: Return the newly created attempt with populated info
      const populatedAttempt = await QuizAttempt.findById(newAttempt._id)
        .populate('quizId', 'topic questions')
        .populate('userId', 'username email');

      return populatedAttempt;
    } catch (error) {
      console.error('Error in calculateAndSaveScore:', error);
      throw error;
    }
  }

  /**
   * Get all quiz attempts for a specific user
   */
  static async getUserQuizAttempts(userId) {
    try {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid user ID format.");
      }

      const attempts = await QuizAttempt.find({ userId })
        .sort({ createdAt: -1 })
        .populate('quizId', 'topic')
        .populate('userId', 'username email');

      return attempts;
    } catch (error) {
      console.error('Error fetching user quiz attempts:', error);
      throw error;
    }
  }

  /**
   * Get quiz statistics for a user
   */
  static async getUserQuizStats(userId) {
    try {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid user ID format.");
      }

      const attempts = await QuizAttempt.find({ userId });

      const totalAttempts = attempts.length;
      const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
      const totalQuestions = attempts.reduce((sum, attempt) => sum + attempt.totalQuestions, 0);
      const averageScore = totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;

      return {
        totalAttempts,
        totalScore,
        totalQuestions,
        averageScore: Math.round(averageScore * 100) / 100,
      };
    } catch (error) {
      console.error('Error calculating user quiz stats:', error);
      throw error;
    }
  }
}

module.exports = QuizService;