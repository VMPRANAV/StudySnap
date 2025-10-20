import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    DocumentArrowUpIcon, 
    BookOpenIcon,
    ChevronRightIcon,
    SparklesIcon,
    CheckCircleIcon,
    XCircleIcon,
    HomeIcon,
    ArrowDownTrayIcon,
    QuestionMarkCircleIcon,
    PlusIcon,
    MinusIcon
} from '@heroicons/react/24/solid';

// --- Reusable Progress Indicator Component ---
// (Copied from your QuizPage.jsx for consistency)
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

// --- New Component for Mark Inputs ---
const MarkAllocator = ({ marks, onChange }) => {
    const markTypes = [
        { key: "2", label: "2 Marks", color: "text-cyan-300" },
        { key: "7", label: "7 Marks", color: "text-purple-300" },
        { key: "14", label: "14 Marks", color: "text-pink-300" },
    ];

    const handleChange = (key, delta) => {
        const newValue = Math.max(0, (marks[key] || 0) + delta);
        onChange(key, newValue);
    };

    return (
        <div className="space-y-4">
            {markTypes.map((type) => (
                <div key={type.key} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <label className={`text-lg font-medium ${type.color}`}>{type.label}</label>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleChange(type.key, -1)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <MinusIcon className="h-5 w-5 text-white" />
                        </button>
                        <input
                            type="number"
                            value={marks[type.key] || 0}
                            onChange={(e) => onChange(type.key, parseInt(e.target.value, 10))}
                            className="w-16 h-10 text-center bg-white/5 border-white/20 border rounded-lg text-white font-semibold text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                            type="button"
                            onClick={() => handleChange(type.key, 1)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <PlusIcon className="h-5 w-5 text-white" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};


const QaPage = ({ isSidebarOpen }) => {
    // --- State Management ---
    const [prompt, setPrompt] = useState('Create a detailed Q&A set covering the main themes.');
    const [pdfFile, setPdfFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [savedQaSets, setSavedQaSets] = useState([]);
    const [currentQaSet, setCurrentQaSet] = useState(null);
    const [marks, setMarks] = useState({ "2": 3, "7": 2, "14": 1 }); // State for mark distribution
    
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [step, setStep] = useState('');
    const [error, setError] = useState(null);
    const [view, setView] = useState('generate'); // 'generate', 'review'
    const [isDragging, setIsDragging] = useState(false);

    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const backend = import.meta.env.VITE_URL || 'http://localhost:3000';
    const backendUrl = `${backend}/api/qa`; // Backend URL for Q&A routes

    // --- Auth & Helpers (from FlashcardPage.jsx) ---

    // Helper function to get auth headers
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        if (!token || token.trim() === '' || token === 'undefined' || token === 'null') {
            throw new Error('No valid authentication token found');
        }
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    // Helper function to handle auth errors
    const handleAuthError = (response) => {
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setIsAuthenticated(false);
            setError('Session expired. Please log in again.');
            return true;
        }
        return false;
    };

    // Check authentication on load
    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            const isValid = token && token.trim() !== '' && token !== 'undefined' && user && user !== 'undefined';
            
            setIsAuthenticated(isValid);
            setIsCheckingAuth(false);
            
            if (!isValid) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        };
        checkAuth();
        window.addEventListener('storage', checkAuth);
        return () => window.removeEventListener('storage', checkAuth);
    }, []);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchQaSets = async () => {
            if (!isAuthenticated) return;

            try {
                const headers = getAuthHeaders();
                const response = await fetch(backendUrl, { headers });

                if (handleAuthError(response)) return;
                if (!response.ok) {
                    throw new Error(`Failed to fetch Q&A sets: ${response.status}`);
                }

                const data = await response.json();
                setSavedQaSets(data || []);
                setError(null);
            } catch (err) {
                console.error('Error fetching Q&A sets:', err);
                if (err.message.includes('token')) {
                    setIsAuthenticated(false);
                } else {
                    setError('Could not load your saved Q&A sets.');
                }
            }
        };

        fetchQaSets();
    }, [isAuthenticated, backendUrl]); // Added backendUrl to dependency array

    // --- File & Input Handlers (from FlashcardPage.jsx) ---
    const processFile = (file) => {
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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) processFile(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) processFile(files[0]);
    };

    const handleDragOver = (e) => e.preventDefault();
    const handleDragEnter = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };

    const handleMarkChange = (key, value) => {
        setMarks(prev => ({ ...prev, [key]: Math.max(0, value) }));
    };

    // --- Core Logic: Generation & Download ---
    const handleGenerateQaSet = async () => {
        if (!prompt || !pdfFile) {
            setError("Please upload a PDF and provide instructions.");
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            setError("Authentication required. Please log in again.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setProgress(0);
        
        try {
            // Step 1: Upload PDF (using '/upload' route from qa.routes.js)
            setStep('Uploading PDF document...');
            setProgress(25);
            
            const formData = new FormData();
            formData.append('file', pdfFile);
            
            const uploadRes = await fetch(`${backendUrl}/upload`, { 
                method: 'POST', 
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData 
            });
            
            if (handleAuthError(uploadRes)) return;
            if (!uploadRes.ok) {
                const errData = await uploadRes.json();
                throw new Error(`PDF upload failed: ${errData.message}`);
            }
            
            const uploadData = await uploadRes.json();
            const { fileId } = uploadData;

            // Step 2: Generate Q&A Set (using '/generate' route)
            setStep('Generating Q&A set with AI...');
            setProgress(65);
            
            const headers = getAuthHeaders();
            const payload = { fileId, prompt, marksDistribution: marks };

            const genRes = await fetch(`${backendUrl}/generate`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            
            if (handleAuthError(genRes)) return;
            if (!genRes.ok) {
                const errData = await genRes.json();
                throw new Error(`Q&A generation failed: ${errData.message}`);
            }
            
            const newQaSet = await genRes.json();
            
            // Step 3: Complete
            setStep('Q&A set generated successfully!');
            setProgress(100);
            
            setTimeout(() => {
                setSavedQaSets(prev => [newQaSet, ...prev]);
                handleStartReview(newQaSet);
                setProgress(0);
                setStep('');
            }, 1000);

        } catch (err) {
            console.error('Q&A generation error:', err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPdf = async (setId) => {
        setIsDownloading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/${setId}/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (handleAuthError(response)) return;
            if (!response.ok) throw new Error('PDF download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');

            // Extract filename from 'Content-Disposition' header
            const disposition = response.headers.get('content-disposition');
            let filename = 'qa-set.pdf';
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download error:', err);
            setError(err.message || 'Could not download PDF.');
        } finally {
            setIsDownloading(false);
        }
    };

    // --- View Navigation ---
    const handleStartReview = (qaSet) => {
        setCurrentQaSet(qaSet);
        setError(null);
        setView('review');
    };
    
    const resetToGenerator = () => {
        setView('generate');
        setCurrentQaSet(null);
        setError(null);
    };

    // --- Auth Loading/Error States ---
    if (isCheckingAuth) {
        return <div className="min-h-screen flex items-center justify-center"><div className="text-white text-xl">Checking authentication...</div></div>;
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
                    <p className="text-slate-300 mb-6">Please log in to access the Q&A Generator.</p>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg hover:from-cyan-600 hover:to-purple-700 transition-all"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    // --- Main Render ---
    return (
        <div className={`min-h-screen transition-all duration-300`}>
            <motion.div 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="text-center mb-12"
            >
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Q&A Set Generator
                </h1>
                <p className="text-xl text-slate-300 font-light">
                    Generate custom-marked questions from your documents.
                </p>
            </motion.div>

            <div className={`max-w-7xl mx-auto transition-all duration-300 ${isSidebarOpen ? 'px-4' : 'px-6'}`}>
                <AnimatePresence mode="wait">
                    {view === 'generate' && (
                        <motion.div 
                            key="generate"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`grid grid-cols-1 ${isSidebarOpen ? 'lg:grid-cols-2' : 'xl:grid-cols-2'} gap-10 items-start transition-all duration-300`}
                        >
                            {/* Left Panel: Generator */}
                            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl space-y-8">
                                
                                {/* Step 1: Upload */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">1</div>
                                        <h3 className="text-2xl font-bold text-cyan-300">Upload Document</h3>
                                    </div>
                                    <motion.label 
                                        htmlFor="pdf-upload" 
                                        className={`group relative w-full border-2 border-dashed rounded-2xl h-96 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ${
                                            pdfFile 
                                                ? 'bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-400/50 shadow-lg shadow-emerald-500/20' 
                                                : isDragging
                                                ? 'bg-cyan-500/20 border-cyan-400/70 shadow-lg shadow-cyan-500/30'
                                                : 'bg-gradient-to-br from-white/5 to-white/10 border-white/20 hover:border-cyan-400/70 hover:shadow-lg hover:shadow-cyan-500/20'
                                        }`}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onDragOver={handleDragOver}
                                        onDragEnter={handleDragEnter}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        <input id="pdf-upload" type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
                                        <div className="relative z-10 text-center">
                                            {pdfFile ? <CheckCircleIcon className="h-16 w-16 mx-auto mb-4 text-emerald-400" /> : <DocumentArrowUpIcon className="h-16 w-16 mx-auto mb-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />}
                                            <h4 className="text-xl font-semibold text-white">{fileName || 'Choose PDF File'}</h4>
                                            {pdfFile ? <p className="text-emerald-400 font-medium">File ready for processing</p> : <p className="text-slate-400">Drag & drop or click to select</p>}
                                        </div>
                                    </motion.label>
                                </div>

                                {/* Step 2: Instructions */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">2</div>
                                        <h3 className="text-2xl font-bold text-purple-300">Add Instructions</h3>
                                    </div>
                                    <textarea 
                                        value={prompt} 
                                        onChange={(e) => setPrompt(e.target.value)} 
                                        className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 focus:outline-none transition-all duration-300 resize-none min-h-[120px] text-lg"
                                        placeholder="e.g., 'Focus on Chapter 2 concepts...'"
                                    />
                                </div>

                                {/* Step 3: Mark Allocation */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">3</div>
                                        <h3 className="text-2xl font-bold text-pink-300">Set Mark Allocation</h3>
                                    </div>
                                    <MarkAllocator marks={marks} onChange={handleMarkChange} />
                                </div>

                                {/* Generate Button */}
                                <motion.button 
                                    onClick={handleGenerateQaSet} 
                                    disabled={isLoading || !pdfFile} 
                                    className="w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white p-5 rounded-2xl text-xl font-bold flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-500"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="w-6 h-6 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                                            <span>Generating Q&A...</span>
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="h-7 w-7" />
                                            <span>Generate Q&A Set</span>
                                        </>
                                    )}
                                </motion.button>

                                <AnimatePresence>{isLoading && <ProgressIndicator progress={progress} step={step} />}</AnimatePresence>
                                <AnimatePresence>{error && <ErrorDisplay error={error} />}</AnimatePresence>
                            </div>

                            {/* Right Panel: Saved Q&A Sets */}
                            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl min-h-[600px]">
                                <h3 className="text-2xl font-bold mb-8 bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                                    Saved Q&A Sets
                                </h3>
                                <SavedQaSetList sets={savedQaSets} onStartReview={handleStartReview} />
                            </div>
                        </motion.div>
                    )}

                    {view === 'review' && currentQaSet && (
                        <motion.div 
                            key="review" 
                            initial={{ opacity: 0, x: 100 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            exit={{ opacity: 0, x: -100 }}
                        >
                            <QaReview 
                                qaSet={currentQaSet} 
                                onBack={resetToGenerator} 
                                onDownloadPdf={handleDownloadPdf}
                                isDownloading={isDownloading}
                            />
                            <AnimatePresence>{error && <ErrorDisplay error={error} />}</AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// --- Sub-Components ---

const ErrorDisplay = ({ error }) => (
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
);

const SavedQaSetList = ({ sets, onStartReview }) => {
    if (!sets || !sets.length) {
        return (
            <div className="text-center py-16">
                <QuestionMarkCircleIcon className="h-24 w-24 mx-auto text-slate-500/50 mb-6" />
                <p className="text-slate-400 text-xl mb-2">No Q&A sets created yet</p>
                <p className="text-slate-500">Generate your first set to get started!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {sets.map((set, index) => (
                <motion.button 
                    key={set._id} 
                    onClick={() => onStartReview(set)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="w-full text-left p-5 rounded-xl bg-gradient-to-r from-white/5 to-white/10 hover:from-white/10 hover:to-white/20 transition-all duration-300 flex items-center justify-between group border border-white/5 hover:border-white/20"
                    whileHover={{ scale: 1.02 }}
                >
                    <div className="flex items-center gap-4 overflow-hidden">
                        <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                            <QuestionMarkCircleIcon className="h-8 w-8 text-purple-400" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-semibold text-lg truncate text-white group-hover:text-purple-200 transition-colors">
                                {set.topic}
                            </p>
                            <p className="text-sm text-slate-400 mt-1">
                                {new Date(set.createdAt).toLocaleDateString()} • {set.questions?.length || 0} questions
                            </p>
                        </div>
                    </div>
                    <ChevronRightIcon className="h-6 w-6 text-slate-500 group-hover:text-purple-400 transition-colors"/>
                </motion.button>
            ))}
        </div>
    );
};

const QaReview = ({ qaSet, onBack, onDownloadPdf, isDownloading }) => {
    return (
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                    {qaSet.topic}
                </h2>
                <div className="flex gap-4">
                    <button 
                        onClick={onBack} 
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                        <HomeIcon className="h-5 w-5" /> Back
                    </button>
                    <button 
                        onClick={() => onDownloadPdf(qaSet._id)}
                        disabled={isDownloading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/80 text-white hover:bg-cyan-500 transition-colors disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                        ) : (
                            <ArrowDownTrayIcon className="h-5 w-5" />
                        )}
                        Download PDF
                    </button>
                </div>
            </div>

            {/* Q&A List */}
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-3">
                {qaSet.questions.map((qa, index) => (
                    <div 
                        key={index} 
                        className="p-5 bg-black/20 rounded-xl border border-white/10"
                    >
                        <p className="text-lg font-bold text-white mb-2">
                            <span className="text-cyan-300">Q{index + 1}:</span> {qa.question}
                        </p>
                        <p className="text-sm font-medium text-purple-300 mb-3">
                            [{qa.marks} Marks]
                        </p>
                        <div className="border-t border-white/10 pt-3">
                            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                <span className="font-semibold text-slate-200">Answer:</span> {qa.answer}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default QaPage;