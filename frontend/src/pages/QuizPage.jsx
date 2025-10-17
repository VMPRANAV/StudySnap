import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentArrowUpIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  ChartBarIcon,
  BookOpenIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

// --- Reusable Progress Indicator Component ---
const ProgressIndicator = ({ progress, step }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="space-y-3 p-5 bg-black/20 rounded-2xl border border-white/10"
    >
        <div className="flex justify-between items-center mb-1">
            <p className="text-cyan-200 text-sm font-medium">{step}</p>
            <p className="font-mono text-sm text-slate-300">{progress}%</p>
        </div>
        <div className="relative w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-white/5 shadow-inner">
            <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
            />
        </div>
    </motion.div>
);

const backend = import.meta.env.VITE_URL || 'http://localhost:3000';

const QuizPage = () => {
  const [file, setFile] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const [savedQuizzes, setSavedQuizzes] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [error, setError] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Get auth headers
  const getAuthHeaders = () => {
    const token = getAuthToken();
    return {
      'Authorization': `Bearer ${token}`
    };
  };

  // Fetch saved quizzes on component mount
  useEffect(() => {
    fetchSavedQuizzes();
  }, []);

  const fetchSavedQuizzes = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.log('No auth token found');
        return;
      }

      const response = await fetch(`${backend}/api/quizzes`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setSavedQuizzes(data);
      } else if (response.status === 401) {
        setError('Session expired. Please login again.');
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    if (uploadedFile.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setFile(uploadedFile);
    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const response = await fetch(`${backend}/api/quizzes/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const data = await response.json();
        setFileId(data.fileId);
        setUploadProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      } else if (response.status === 401) {
        setError('Session expired. Please login again.');
        setIsUploading(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to upload file');
        setIsUploading(false);
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Upload error:', error);
      setError('Network error. Please try again.');
      setIsUploading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!fileId || !prompt.trim()) {
      setError('Please upload a file and enter a prompt');
      return;
    }

    setIsGenerating(true);
    setGenerateProgress(0);
    setError('');

    const progressInterval = setInterval(() => {
      setGenerateProgress(prev => Math.min(prev + 5, 90));
    }, 500);

    try {
      const response = await fetch(`${backend}/api/quizzes/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ fileId, prompt }),
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const data = await response.json();
        setQuiz(data);
        setUserAnswers(new Array(data.questions.length).fill(null));
        setGenerateProgress(100);
        fetchSavedQuizzes();
        setTimeout(() => {
          setIsGenerating(false);
          setGenerateProgress(0);
        }, 500);
      } else if (response.status === 401) {
        setError('Session expired. Please login again.');
        setIsGenerating(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to generate quiz');
        setIsGenerating(false);
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Generation error:', error);
      setError('Network error. Please try again.');
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (answerIndex) => {
    setSelectedAnswer(answerIndex);
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setUserAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(userAnswers[currentQuestion + 1]);
    }
  };

  const handlePreviousQuestion = () => {
    setSelectedAnswer(null);
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(userAnswers[currentQuestion - 1]);
    }
  };

  const handleSubmitQuiz = async () => {
    if (userAnswers.some(answer => answer === null)) {
      setError('Please answer all questions before submitting');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const formattedAnswers = userAnswers.map((answer, index) => ({
      questionIndex: index,
      selectedAnswerIndex: answer,
    }));

    try {
      const response = await fetch(`${backend}/api/quizzes/${quiz._id}/attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ answers: formattedAnswers }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setShowResults(true);
      } else if (response.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to submit quiz');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadQuiz = (savedQuiz) => {
    setQuiz(savedQuiz);
    setUserAnswers(new Array(savedQuiz.questions.length).fill(null));
    setCurrentQuestion(0);
    setShowResults(false);
    setSelectedAnswer(null);
    setError('');
  };

  const handleStartNewQuiz = () => {
    setFile(null);
    setFileId(null);
    setPrompt('');
    setQuiz(null);
    setCurrentQuestion(0);
    setUserAnswers([]);
    setShowResults(false);
    setResults(null);
    setSelectedAnswer(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold text-white mb-8 text-center bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
        >
          Interactive Quiz
        </motion.h1>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-400/30 rounded-xl flex items-center gap-3"
          >
            <ExclamationCircleIcon className="h-6 w-6 text-red-400 flex-shrink-0" />
            <p className="text-red-300">{error}</p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!quiz && !showResults && (
            <QuizSetup
              file={file}
              fileId={fileId}
              prompt={prompt}
              setPrompt={setPrompt}
              handleFileUpload={handleFileUpload}
              handleGenerateQuiz={handleGenerateQuiz}
              savedQuizzes={savedQuizzes}
              handleLoadQuiz={handleLoadQuiz}
              isUploading={isUploading}
              isGenerating={isGenerating}
              uploadProgress={uploadProgress}
              generateProgress={generateProgress}
            />
          )}

          {quiz && !showResults && (
            <QuizViewer
              quiz={quiz}
              currentQuestion={currentQuestion}
              userAnswers={userAnswers}
              selectedAnswer={selectedAnswer}
              handleAnswerSelect={handleAnswerSelect}
              handlePreviousQuestion={handlePreviousQuestion}
              handleNextQuestion={handleNextQuestion}
              handleSubmitQuiz={handleSubmitQuiz}
              isSubmitting={isSubmitting}
            />
          )}

          {showResults && results && (
            <QuizResults
              results={results}
              quiz={quiz}
              userAnswers={userAnswers}
              handleStartNewQuiz={handleStartNewQuiz}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Sub-Components ---
const QuizSetup = ({
  file,
  fileId,
  prompt,
  setPrompt,
  handleFileUpload,
  handleGenerateQuiz,
  savedQuizzes,
  handleLoadQuiz,
  isUploading,
  isGenerating,
  uploadProgress,
  generateProgress,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="grid grid-cols-1 lg:grid-cols-2 gap-8"
  >
    <div className="space-y-6">
      <motion.div
        className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl"
        whileHover={{ scale: 1.01 }}
      >
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <SparklesIcon className="h-7 w-7 text-cyan-400" />
          Create New Quiz
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-slate-300 mb-3 font-medium">Upload PDF</label>
            <label
              htmlFor="pdf-upload"
              className={`
                flex flex-col items-center justify-center w-full h-40 
                border-2 border-dashed rounded-2xl cursor-pointer
                transition-all duration-300
                ${file
                  ? 'border-cyan-400 bg-cyan-400/10'
                  : 'border-slate-600 hover:border-cyan-400 bg-white/5 hover:bg-white/10'
                }
              `}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <DocumentArrowUpIcon className={`h-12 w-12 mb-3 ${file ? 'text-cyan-400' : 'text-slate-400'}`} />
                <p className="text-sm text-slate-300 mb-1">
                  {file ? file.name : 'Click to upload PDF'}
                </p>
                <p className="text-xs text-slate-500">PDF files only</p>
              </div>
              <input
                id="pdf-upload"
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
            {isUploading && (
              <ProgressIndicator
                progress={uploadProgress}
                step="Uploading PDF..."
              />
            )}
          </div>

          <div>
            <label className="block text-slate-300 mb-3 font-medium">Quiz Topic/Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., Create a quiz on machine learning fundamentals"
              className="w-full bg-white/5 border border-white/20 rounded-2xl p-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all resize-none"
              rows="4"
              disabled={isGenerating}
            />
          </div>

          <motion.button
            onClick={handleGenerateQuiz}
            disabled={!fileId || !prompt.trim() || isUploading || isGenerating}
            className="w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white py-4 rounded-2xl font-bold hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            whileHover={{ scale: isGenerating ? 1 : 1.02 }}
            whileTap={{ scale: isGenerating ? 1 : 0.98 }}
          >
            {isGenerating ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="h-5 w-5" />
                Generate Quiz
              </>
            )}
          </motion.button>

          {isGenerating && (
            <ProgressIndicator
              progress={generateProgress}
              step="AI is crafting your quiz..."
            />
          )}
        </div>
      </motion.div>
    </div>

    <SavedQuizzesList quizzes={savedQuizzes} onLoad={handleLoadQuiz} />
  </motion.div>
);

const SavedQuizzesList = ({ quizzes, onLoad }) => (
  <motion.div
    className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
  >
    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
      <BookOpenIcon className="h-7 w-7 text-purple-400" />
      Saved Quizzes
    </h2>

    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
      {quizzes.length === 0 ? (
        <p className="text-slate-400 text-center py-8">No saved quizzes yet</p>
      ) : (
        quizzes.map((quiz) => (
          <motion.div
            key={quiz._id}
            className="bg-white/5 rounded-xl p-5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
            whileHover={{ scale: 1.02, x: 5 }}
            onClick={() => onLoad(quiz)}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-white font-semibold line-clamp-2">{quiz.topic}</h3>
              <span className="text-cyan-400 text-sm font-mono bg-cyan-400/10 px-2 py-1 rounded">
                {quiz.questions.length}Q
              </span>
            </div>
            <p className="text-slate-400 text-sm flex items-center gap-2">
              <ClockIcon className="h-4 w-4" />
              {new Date(quiz.createdAt).toLocaleDateString()}
            </p>
          </motion.div>
        ))
      )}
    </div>
  </motion.div>
);

const QuizViewer = ({
  quiz,
  currentQuestion,
  userAnswers,
  selectedAnswer,
  handleAnswerSelect,
  handlePreviousQuestion,
  handleNextQuestion,
  handleSubmitQuiz,
  isSubmitting,
}) => {
  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto"
    >
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white text-xl font-semibold">
              Question {currentQuestion + 1} of {quiz.questions.length}
            </h2>
            <span className="text-cyan-400 font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-white text-2xl font-bold mb-6">{question.questionText}</h3>

          <div className="space-y-4">
            {question.options.map((option, index) => (
              <motion.button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`
                  w-full text-left p-5 rounded-xl border-2 transition-all
                  ${selectedAnswer === index
                    ? 'border-cyan-400 bg-cyan-400/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }
                `}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <span className="text-white font-medium">{option}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center gap-4">
          <motion.button
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: currentQuestion === 0 ? 1 : 1.05 }}
          >
            Previous
          </motion.button>

          {currentQuestion === quiz.questions.length - 1 ? (
            <motion.button
              onClick={handleSubmitQuiz}
              disabled={isSubmitting || userAnswers.some(a => a === null)}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:shadow-2xl hover:shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
            >
              {isSubmitting ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  Submit Quiz
                </>
              )}
            </motion.button>
          ) : (
            <motion.button
              onClick={handleNextQuestion}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-2xl hover:shadow-purple-500/25 transition-all"
              whileHover={{ scale: 1.05 }}
            >
              Next
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const QuizResults = ({ results, quiz, userAnswers, handleStartNewQuiz }) => {
  const percentage = (results.score / results.totalQuestions) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="inline-block"
        >
          {percentage >= 70 ? (
            <CheckCircleIcon className="h-24 w-24 text-green-400 mx-auto mb-4" />
          ) : (
            <XCircleIcon className="h-24 w-24 text-red-400 mx-auto mb-4" />
          )}
        </motion.div>

        <h2 className="text-4xl font-bold text-white mb-4">
          {percentage >= 70 ? 'Great Job!' : 'Keep Practicing!'}
        </h2>

        <div className="flex justify-center items-center gap-8 my-8">
          <div className="text-center">
            <p className="text-6xl font-bold text-cyan-400">{results.score}</p>
            <p className="text-slate-400 mt-2">Correct</p>
          </div>
          <div className="text-slate-600 text-4xl">/</div>
          <div className="text-center">
            <p className="text-6xl font-bold text-slate-400">{results.totalQuestions}</p>
            <p className="text-slate-400 mt-2">Total</p>
          </div>
        </div>

        <div className="mb-8">
          <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden">
            <motion.div
              className={`h-full ${
                percentage >= 70
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                  : 'bg-gradient-to-r from-orange-400 to-red-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="text-slate-400 mt-2">{percentage.toFixed(1)}% Score</p>
        </div>

        <motion.button
          onClick={handleStartNewQuiz}
          className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white px-10 py-4 rounded-2xl font-bold hover:shadow-2xl hover:shadow-purple-500/25 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Start New Quiz
        </motion.button>
      </div>

      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <ChartBarIcon className="h-7 w-7 text-purple-400" />
          Answer Review
        </h3>

        <div className="space-y-6">
          {quiz.questions.map((question, index) => {
            const userAnswer = userAnswers[index];
            const isCorrect = userAnswer === question.correctAnswerIndex;

            return (
              <div
                key={index}
                className={`p-6 rounded-xl border-2 ${
                  isCorrect
                    ? 'border-green-400/30 bg-green-400/10'
                    : 'border-red-400/30 bg-red-400/10'
                }`}
              >
                <div className="flex items-start gap-3 mb-4">
                  {isCorrect ? (
                    <CheckCircleIcon className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                  ) : (
                    <XCircleIcon className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <p className="text-white font-semibold mb-2">
                      Question {index + 1}: {question.questionText}
                    </p>
                    <div className="space-y-2">
                      <p className="text-slate-300">
                        <span className="font-medium">Your answer:</span>{' '}
                        <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>
                          {question.options[userAnswer]}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p className="text-slate-300">
                          <span className="font-medium">Correct answer:</span>{' '}
                          <span className="text-green-400">
                            {question.options[question.correctAnswerIndex]}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default QuizPage;