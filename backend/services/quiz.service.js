const mongoose = require('mongoose');
const Quiz = require('../models/quiz.model');
const QuizAttempt = require('../models/quizAttempt.model'); 

class QuizService {
  static async calculateAndSaveScore(quizId, userId, userAnswers) {
    try {
      // Validate quizId format
      if (!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new Error("Invalid quiz ID format.");
      }

      // Step 1: Fetch the original quiz to get the correct answers
      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        throw new Error("Quiz not found.");
      }

      console.log('Found quiz:', quiz.topic, 'with', quiz.questions.length, 'questions');

      // Step 2: Calculate the score
      let score = 0;
      const totalQuestions = quiz.questions.length;

      quiz.questions.forEach((question, index) => {
        const userAnswer = userAnswers.find(ans => ans.questionIndex === index);
        if (userAnswer && userAnswer.selectedAnswerIndex === question.correctAnswerIndex) {
          score++;
        }
      });

      console.log('Calculated score:', score, 'out of', totalQuestions);

      // Step 3: Create a new QuizAttempt document
      const attemptData = {
        quizId: new mongoose.Types.ObjectId(quizId),
        answers: userAnswers,
        score,
        totalQuestions,
      };

      // Only add userId if it's provided AND it's a valid ObjectId
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        attemptData.userId = new mongoose.Types.ObjectId(userId);
      }
      // If userId is provided but not valid ObjectId, ignore it (don't add to attemptData)

      const newAttempt = new QuizAttempt(attemptData);

      // Step 4: Save the attempt to the database
      await newAttempt.save();

      console.log('Saved quiz attempt with ID:', newAttempt._id);

      // Step 5: Return the newly created attempt with populated quiz info
      const populatedAttempt = await QuizAttempt.findById(newAttempt._id)
        .populate('quizId', 'topic questions');

      return populatedAttempt;
    } catch (error) {
      console.error('Error in calculateAndSaveScore:', error);
      throw error;
    }
  }
}

module.exports = QuizService;