import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    DocumentArrowUpIcon, 
    BookOpenIcon,
    ChevronRightIcon,
    SparklesIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    HomeIcon
} from '@heroicons/react/24/solid';

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

const QuizPage = () => { // Remove user prop
    // --- State Management ---
    const [prompt, setPrompt] = useState('Create a 5 question quiz on the key topics.');
    const [pdfFile, setPdfFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [savedQuizzes, setSavedQuizzes] = useState([]);
    const [currentQuiz, setCurrentQuiz] = useState(null);
    const [quizResults, setQuizResults] = useState(null);
    
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [step, setStep] = useState('');
    const [error, setError] = useState(null);
    const [view, setView] = useState('generate'); // 'generate', 'take_quiz', 'results'

    // Authentication check state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    const backendUrl = 'http://localhost:3002/api/quizzes';

    // Helper function to get auth headers
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    // Helper function to handle auth errors
    const handleAuthError = (response) => {
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setError('Session expired. Please log in again.');
            // Redirect to login after a delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            return true;
        }
        return false;
    };

    // --- Data Fetching ---
    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('User not authenticated');
                    return;
                }

                const headers = getAuthHeaders();
                const response = await fetch(backendUrl, { headers });

                if (handleAuthError(response)) return;

                if (!response.ok) {
                    throw new Error(`Failed to fetch quizzes: ${response.status}`);
                }

                const data = await response.json();
                setSavedQuizzes(data || []);
                setError(null);
            } catch (err) {
                console.error('Error fetching quizzes:', err);
                if (err.message.includes('authentication')) {
                    setError('Authentication required. Please log in again.');
                } else {
                    setError('Could not load your saved quizzes. Please try refreshing the page.');
                }
            }
        };

        if (isAuthenticated) {
            fetchQuizzes();
        }
    }, [isAuthenticated]); // Changed from user dependency

    // --- Event Handlers ---
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === "application/pdf") {
            setPdfFile(file);
            setFileName(file.name);
            setError(null);
        } else {
            setPdfFile(null);
            setFileName('');
            setError("Please select a valid PDF file.");
        }
    };

    const handleGenerateQuiz = async () => {
        if (!prompt || !pdfFile) {
            setError("Please upload a PDF and provide instructions.");
            return;
        }

        if (!user) {
            setError("Authentication required. Please log in again.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setProgress(0);
        setStep('');
        
        try {
            // Step 1: Upload PDF
            setStep('Uploading PDF document...');
            setProgress(25);
            
            const formData = new FormData();
            formData.append('file', pdfFile);
            
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const uploadRes = await fetch(`${backendUrl}/upload`, { 
                method: 'POST', 
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData 
            });
            
            if (handleAuthError(uploadRes)) return;
            
            if (!uploadRes.ok) {
                const errorText = await uploadRes.text();
                throw new Error(`PDF upload failed: ${errorText}`);
            }
            
            const uploadData = await uploadRes.json();
            const { fileId } = uploadData;

            if (!fileId) {
                throw new Error('No file ID received from server');
            }

            // Step 2: Generate Quiz
            setStep('Generating quiz with AI...');
            setProgress(65);
            
            const headers = getAuthHeaders();
            const genRes = await fetch(`${backendUrl}/generate`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ fileId, prompt }),
            });
            
            if (handleAuthError(genRes)) return;
            
            if (!genRes.ok) {
                const errorText = await genRes.text();
                throw new Error(`Quiz generation failed: ${errorText}`);
            }
            
            const newQuiz = await genRes.json();
            
            // Validate quiz structure
            if (!newQuiz || !newQuiz.questions || !Array.isArray(newQuiz.questions)) {
                throw new Error('Invalid quiz format received from server');
            }
            
            // Step 3: Complete
            setStep('Quiz generated successfully!');
            setProgress(100);
            
            setTimeout(() => {
                setSavedQuizzes(prev => [newQuiz, ...prev]);
                handleStartQuiz(newQuiz);
                setProgress(0);
                setStep('');
            }, 1000);

        } catch (err) {
            console.error('Quiz generation error:', err);
            if (err.message.includes('authentication')) {
                setError('Session expired. Please log in again.');
            } else {
                setError(err.message || "An unexpected error occurred.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartQuiz = (quiz) => {
        if (!quiz || !quiz.questions || quiz.questions.length === 0) {
            setError('Invalid quiz data');
            return;
        }
        setCurrentQuiz(quiz);
        setQuizResults(null);
        setError(null);
        setView('take_quiz');
    };
    
    const handleSubmitQuiz = async (answers) => {
        if (!currentQuiz || !currentQuiz._id) {
            setError('No quiz selected');
            return;
        }

        if (!user) {
            setError("Authentication required. Please log in again.");
            return;
        }
        
        try {
            setIsLoading(true);
            
            // Validate answers format
            if (!answers || !Array.isArray(answers)) {
                throw new Error('Invalid answers format');
            }

            const headers = getAuthHeaders();
            const response = await fetch(`${backendUrl}/${currentQuiz._id}/submit`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ answers })
            });

            if (handleAuthError(response)) return;
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to submit quiz: ${errorText}`);
            }
            
            const resultsData = await response.json();
            
            if (!resultsData) {
                throw new Error('No results received from server');
            }
            
            setQuizResults(resultsData);
            setView('results');
            setError(null);
            
        } catch (err) {
            console.error('Quiz submission error:', err);
            if (err.message.includes('authentication')) {
                setError('Session expired. Please log in again.');
            } else {
                setError(err.message || "Could not submit your quiz. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const resetToGenerator = () => {
        setView('generate');
        setCurrentQuiz(null);
        setQuizResults(null);
        setError(null);
        // Don't reset PDF file and filename to preserve user's upload
    };

    // Check if user is authenticated
    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token);
        setIsCheckingAuth(false);
    }, []);

    // Replace the user authentication check
    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-white">Checking authentication...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
                    <p className="text-slate-300 mb-6">Please log in to access the Quiz Builder.</p>
                    <button 
                        onClick={() => window.location.href = '/login'}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg hover:from-cyan-600 hover:to-purple-700 transition-all"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    // --- Main Render Logic ---
    return (
        <div className="min-h-screen">
            <motion.div 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="text-center mb-12"
            >
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Interactive Quiz Builder
                </h1>
                <p className="text-xl text-slate-300 font-light">
                    Generate engaging quizzes from your documents in seconds.
                </p>
            </motion.div>

            <div className="max-w-7xl mx-auto">
                <AnimatePresence mode="wait">
                    {view === 'generate' && (
                        <motion.div 
                            key="generate"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start"
                        >
                            {/* Left Panel: Generator */}
                            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl space-y-8">
                                {/* Upload Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">1</div>
                                        <h3 className="text-2xl font-bold text-cyan-300">Upload Document</h3>
                                    </div>
                                    
                                    <motion.label 
                                        htmlFor="pdf-upload" 
                                        className={`group relative w-full border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-500 ${
                                            pdfFile 
                                                ? 'bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-400/50 shadow-lg shadow-emerald-500/20' 
                                                : 'bg-gradient-to-br from-white/5 to-white/10 border-white/20 hover:border-cyan-400/70 hover:shadow-lg hover:shadow-cyan-500/20'
                                        }`}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="relative z-10">
                                            {pdfFile ? (
                                                <CheckCircleIcon className="h-16 w-16 mx-auto mb-4 text-emerald-400" />
                                            ) : (
                                                <DocumentArrowUpIcon className="h-16 w-16 mx-auto mb-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                                            )}
                                            
                                            <div className="space-y-2">
                                                <h4 className="text-xl font-semibold text-white">
                                                    {fileName || 'Choose PDF File'}
                                                </h4>
                                                
                                                {pdfFile ? (
                                                    <div className="text-emerald-400 font-medium flex items-center justify-center gap-2">
                                                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                        File ready for processing
                                                    </div>
                                                ) : (
                                                    <p className="text-slate-400">Drag & drop or click to select</p>
                                                )}
                                                
                                                <p className="text-xs text-slate-500 mt-2">
                                                    Maximum file size: 10MB • PDF format only
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <input 
                                            id="pdf-upload" 
                                            type="file" 
                                            accept="application/pdf" 
                                            className="hidden" 
                                            onChange={handleFileChange} 
                                        />
                                    </motion.label>
                                </div>

                                {/* Instructions Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">2</div>
                                        <h3 className="text-2xl font-bold text-purple-300">Customize Instructions</h3>
                                    </div>
                                    
                                    <div className="relative">
                                        <textarea 
                                            value={prompt} 
                                            onChange={(e) => setPrompt(e.target.value)} 
                                            className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 focus:outline-none transition-all duration-300 resize-none min-h-[120px] text-lg leading-relaxed" 
                                            placeholder="Describe what type of quiz you want to create..."
                                        />
                                        <div className="absolute bottom-3 right-3 text-xs text-slate-500">
                                            {prompt.length}/500
                                        </div>
                                    </div>
                                </div>

                                {/* Generate Button */}
                                <motion.button 
                                    onClick={handleGenerateQuiz} 
                                    disabled={isLoading || !pdfFile} 
                                    className="w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white p-5 rounded-2xl text-xl font-bold flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 relative overflow-hidden"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="relative z-10 flex items-center gap-3">
                                        {isLoading ? (
                                            <>
                                                <div className="w-6 h-6 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                                                <span>Generating Quiz...</span>
                                            </>
                                        ) : (
                                            <>
                                                <SparklesIcon className="h-7 w-7" />
                                                <span>Generate Quiz</span>
                                            </>
                                        )}
                                    </div>
                                </motion.button>

                                {/* Progress Indicator */}
                                <AnimatePresence>
                                    {isLoading && (
                                        <ProgressIndicator progress={progress} step={step} />
                                    )}
                                </AnimatePresence>

                                {/* Error Display */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="p-4 bg-red-500/10 border border-red-400/30 rounded-xl flex items-start gap-3"
                                        >
                                            <XCircleIcon className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-red-300 font-semibold">
                                                    {error.includes('authentication') || error.includes('Session expired') ? 'Authentication Error' : 'Generation Failed'}
                                                </p>
                                                <p className="text-red-200/80 text-sm mt-1">{error}</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Right Panel: Saved Quizzes */}
                            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl min-h-[600px]">
                                <h3 className="text-2xl font-bold mb-8 bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                                    Saved Quizzes
                                </h3>
                                <SavedQuizzesList quizzes={savedQuizzes} onStart={handleStartQuiz} />
                            </div>
                        </motion.div>
                    )}

                    {view === 'take_quiz' && currentQuiz && (
                        <motion.div 
                            key="take_quiz" 
                            initial={{ opacity: 0, x: 100 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            exit={{ opacity: 0, x: -100 }}
                        >
                            <Quizzer quiz={currentQuiz} onSubmit={handleSubmitQuiz} onBack={resetToGenerator} isLoading={isLoading} />
                        </motion.div>
                    )}
                    
                    {view === 'results' && quizResults && currentQuiz && (
                        <motion.div 
                            key="results" 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 1.1 }}
                        >
                            <QuizResults 
                                results={quizResults} 
                                quiz={currentQuiz} 
                                onRestart={() => handleStartQuiz(currentQuiz)} 
                                onHome={resetToGenerator} 
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// --- Sub-Components (unchanged except for better error handling) ---

const SavedQuizzesList = ({ quizzes, onStart }) => {
    if (!quizzes || !quizzes.length) {
        return (
            <div className="text-center py-16">
                <BookOpenIcon className="h-24 w-24 mx-auto text-slate-500/50 mb-6" />
                <p className="text-slate-400 text-xl mb-2">No quizzes created yet</p>
                <p className="text-slate-500">Generate your first quiz to get started!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {quizzes.map((quiz, index) => (
                <motion.button 
                    key={quiz._id} 
                    onClick={() => onStart(quiz)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="w-full text-left p-5 rounded-xl bg-gradient-to-r from-white/5 to-white/10 hover:from-white/10 hover:to-white/20 transition-all duration-300 flex items-center justify-between group border border-white/5 hover:border-white/20"
                    whileHover={{ scale: 1.02 }}
                >
                    <div className="flex items-center gap-4 overflow-hidden">
                        <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                            <BookOpenIcon className="h-8 w-8 text-cyan-400" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-semibold text-lg truncate text-white group-hover:text-cyan-200 transition-colors">
                                {quiz.topic}
                            </p>
                            <p className="text-sm text-slate-400 mt-1">
                                {new Date(quiz.createdAt).toLocaleDateString()} • {quiz.questions?.length || 0} questions
                            </p>
                        </div>
                    </div>
                    <ChevronRightIcon className="h-6 w-6 text-slate-500 group-hover:text-cyan-400 transition-colors"/>
                </motion.button>
            ))}
        </div>
    );
};

const Quizzer = ({ quiz, onSubmit, onBack, isLoading }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});

    const handleSelectAnswer = (questionIndex, answerIndex) => {
        setSelectedAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
    };
    
    const handleFinish = () => {
        if (isLoading) return;
        
        const formattedAnswers = Object.entries(selectedAnswers).map(([qIdx, aIdx]) => ({
            questionIndex: parseInt(qIdx, 10),
            selectedAnswerIndex: aIdx
        }));
        onSubmit(formattedAnswers);
    };

    const currentQuestion = quiz.questions[currentIndex];
    const progress = ((currentIndex + 1) / quiz.questions.length) * 100;
    
    return (
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                    {quiz.topic}
                </h2>
                <button 
                    onClick={onBack} 
                    className="text-sm text-cyan-300 hover:text-cyan-100 font-medium px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                    ← Back to Generator
                </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-2 mb-8">
                <motion.div 
                    className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>
            
            {/* Question Text */}
            <div className="bg-black/20 p-6 rounded-xl mb-8">
                <p className="text-slate-400 text-sm mb-2">
                    Question {currentIndex + 1} of {quiz.questions.length}
                </p>
                <p className="text-2xl font-bold text-white leading-relaxed">
                    {currentQuestion.questionText}
                </p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswers[currentIndex] === index;
                    return (
                        <motion.button
                            key={index}
                            onClick={() => handleSelectAnswer(currentIndex, index)}
                            className={`p-4 rounded-xl text-left transition-all border-2 ${
                                isSelected 
                                    ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/25' 
                                    : 'bg-white/5 border-transparent hover:border-white/20 hover:bg-white/10'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                    isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-400'
                                }`} />
                                <span className={`font-semibold text-lg ${
                                    isSelected ? 'text-cyan-200' : 'text-white'
                                }`}>
                                    {option}
                                </span>
                            </div>
                        </motion.button>
                    );
                })}
            </div>
            
            {/* Navigation */}
            <div className="flex justify-between items-center">
                <button 
                    onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} 
                    disabled={currentIndex === 0} 
                    className="px-6 py-2 rounded-lg bg-white/10 disabled:opacity-50 text-white hover:bg-white/20 transition-colors"
                >
                    Previous
                </button>
                
                {currentIndex === quiz.questions.length - 1 ? (
                    <button 
                        onClick={handleFinish} 
                        disabled={isLoading}
                        className="px-8 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold disabled:opacity-50 hover:shadow-lg transition-all"
                    >
                        {isLoading ? 'Submitting...' : 'Finish Quiz'}
                    </button>
                ) : (
                    <button 
                        onClick={() => setCurrentIndex(p => Math.min(quiz.questions.length - 1, p + 1))} 
                        className="px-6 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                        Next
                    </button>
                )}
            </div>
        </div>
    );
};

const QuizResults = ({ results, quiz, onRestart, onHome }) => {
    if (!results || !quiz) {
        return (
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl max-w-4xl mx-auto text-center">
                <p className="text-red-400">Error: Missing results or quiz data</p>
            </div>
        );
    }

    const { score, totalQuestions, answers } = results;
    const percentage = Math.round((score / totalQuestions) * 100);

    return (
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl max-w-4xl mx-auto">
            {/* Header and Score */}
            <div className="text-center mb-8">
                <h2 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                    Quiz Complete!
                </h2>
                <p className="text-slate-300 text-lg">You scored</p>
                <p className="text-7xl font-bold my-4 text-white">{score} / {totalQuestions}</p>
                <p className="text-2xl font-semibold mb-4 text-slate-300">{percentage}%</p>
                <div className="w-full bg-slate-800 rounded-full h-4 mt-4 overflow-hidden">
                    <motion.div 
                        className="h-4 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                    />
                </div>
            </div>

            {/* Answer Review */}
            <div className="space-y-4 max-h-80 overflow-y-auto pr-3 mb-8">
                {quiz.questions.map((question, index) => {
                    const attempt = answers?.find(a => a.questionIndex === index);
                    const userAnswerIndex = attempt ? attempt.selectedAnswerIndex : -1;
                    const correctIndex = question.correctAnswerIndex;
                    const isCorrect = userAnswerIndex === correctIndex;

                    return (
                        <div 
                            key={index} 
                            className={`p-4 rounded-xl border ${
                                isCorrect 
                                    ? 'bg-green-500/10 border-green-500/30' 
                                    : 'bg-red-500/10 border-red-500/30'
                            }`}
                        >
                            <div className="flex items-start gap-3 mb-3">
                                {isCorrect ? (
                                    <CheckCircleIcon className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                                ) : (
                                    <XCircleIcon className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
                                )}
                                <p className="font-semibold text-white">
                                    {index + 1}. {question.questionText}
                                </p>
                            </div>
                            <p className="text-sm text-slate-400 mb-2">Your answer: 
                                <span className={`font-medium ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                                    {userAnswerIndex > -1 ? ` ${question.options[userAnswerIndex]}` : ' Not answered'}
                                </span>
                            </p>
                            {!isCorrect && (
                                <p className="text-sm text-red-300">
                                    Correct answer: {question.options[correctIndex]}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Actions */}
            <div className="flex justify-center gap-4">
                 <button onClick={onHome} className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                     <HomeIcon className="h-5 w-5" /> Back to Home
                 </button>
                 <button onClick={onRestart} className="flex items-center gap-2 px-6 py-3 rounded-lg bg-cyan-500/80 text-white hover:bg-cyan-500 transition-colors">
                     <ArrowPathIcon className="h-5 w-5" /> Try Again
                 </button>
            </div>
        </div>
    );
};

export default QuizPage;