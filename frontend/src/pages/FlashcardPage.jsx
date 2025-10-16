import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeftIcon, 
    ArrowRightIcon, 
    DocumentArrowUpIcon, 
    BookOpenIcon,
    ChevronRightIcon,
    SparklesIcon,
    CheckCircleIcon
} from '@heroicons/react/24/solid';

// Progress Indicator Component
const ProgressIndicator = ({ progress, step }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto', transition: { duration: 0.4, ease: "easeOut" } }}
            exit={{ opacity: 0, y: 10, height: 0, transition: { duration: 0.3, ease: "easeIn" } }}
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
                >
                    <div
                        className="w-full h-full"
                        style={{
                            boxShadow: `0 0 8px 1px rgba(168, 85, 247, 0.4), 0 0 4px 1px rgba(34, 211, 238, 0.5)`
                        }}
                    />
                </motion.div>
                <div
                    className="absolute inset-0 w-full h-full"
                    style={{
                        animation: 'shimmer 2s infinite linear',
                        background: 'linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%)',
                        backgroundSize: '1000px 100%',
                    }}
                />
            </div>
        </motion.div>
    );
};

const FlashcardPage = ({ user }) => {
    const [prompt, setPrompt] = useState('Create 5 flashcards on the key definitions.');
    const [pdfFile, setPdfFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [flashcards, setFlashcards] = useState([]);
    const [savedSets, setSavedSets] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('');
    const [error, setError] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [view, setView] = useState('generate');

    const backendUrl = '${import.meta.env.VITE_URL}/api/flashcards';

    // Helper function to get auth headers
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    useEffect(() => {
        const fetchSets = async () => {
            try {
                const token = localStorage.getItem('token');
                
                if (!token) {
                    setError('No authentication token found');
                    return;
                }

                const response = await fetch(backendUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.status === 401) {
                    // Token is invalid, redirect to login
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.reload();
                    return;
                }

                if (!response.ok) {
                    throw new Error('Failed to fetch saved sets.');
                }

                const data = await response.json();
                setSavedSets(data);
            } catch (err) {
                console.error("Could not fetch saved flashcard sets.", err);
                setError('Could not connect to the backend to fetch saved sets.');
            }
        };
        fetchSets();
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === "application/pdf") {
            setPdfFile(file);
            setFileName(file.name);
            setError(null);
            setUploadProgress(0);
            setCurrentStep('');
        } else {
            setPdfFile(null);
            setFileName('');
            setUploadProgress(0);
            setCurrentStep('');
            setError("Please select a valid PDF file.");
        }
    };

    const handleGenerate = async () => {
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
        setUploadProgress(0);
        
        try {
            // Step 1: Upload PDF
            setCurrentStep('Uploading PDF document...');
            setUploadProgress(25);
            
            const formData = new FormData();
            formData.append('file', pdfFile);
            
            const uploadRes = await fetch(`${backendUrl}/upload`, { 
                method: 'POST', 
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData 
            });
            
            if (uploadRes.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.reload();
                return;
            }
            
            if (!uploadRes.ok) {
                throw new Error(`PDF upload failed with status: ${uploadRes.status}`);
            }
            
            setUploadProgress(50);
            setCurrentStep('Processing PDF content...');
            
            const uploadData = await uploadRes.json();
            const fileId = uploadData.fileId;
            
            // Step 2: Generate flashcards
            setCurrentStep('Generating flashcards with AI...');
            setUploadProgress(75);
            
            const genRes = await fetch(`${backendUrl}/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileId, prompt }),
            });
            
            if (genRes.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.reload();
                return;
            }
            
            if (!genRes.ok) {
                throw new Error(`Flashcard generation failed with status: ${genRes.status}`);
            }
            
            const newSet = await genRes.json();
            
            // Step 3: Complete
            setCurrentStep('Flashcards generated successfully!');
            setUploadProgress(100);
            
            setTimeout(() => {
                setFlashcards(newSet.flashcards);
                setSavedSets(prev => [newSet, ...prev]);
                setCurrentIndex(0);
                setView('viewer');
                setUploadProgress(0);
                setCurrentStep('');
            }, 1000);

        } catch (err) {
            setError(err.message || "An unexpected error occurred. Please check the console.");
            setUploadProgress(0);
            setCurrentStep('');
        } finally {
            setIsLoading(false);
        }
    };

    const loadSet = (set) => {
        setFlashcards(set.flashcards);
        setCurrentIndex(0);
        setView('viewer');
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Flashcard Generator
                </h1>
                <p className="text-xl text-slate-300 font-light">
                    Transform your documents into interactive study materials
                </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start max-w-7xl mx-auto">
                {/* Left Panel - Generator */}
                <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl space-y-8"
                >
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
                            
                            <div className="absolute inset-0 overflow-hidden rounded-2xl">
                                <div className="absolute -top-2 -right-2 w-4 h-4 bg-cyan-400/30 rounded-full blur-sm"></div>
                                <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-purple-400/20 rounded-full blur-sm"></div>
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
                                placeholder="Describe what type of flashcards you want to create..."
                            />
                            <div className="absolute bottom-3 right-3 text-xs text-slate-500">
                                {prompt.length}/500
                            </div>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <motion.button 
                        onClick={handleGenerate} 
                        disabled={isLoading || !pdfFile} 
                        className="w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white p-5 rounded-2xl text-xl font-bold flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 relative overflow-hidden"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="relative z-10 flex items-center gap-3">
                            {isLoading ? (
                                <>
                                    <div className="w-6 h-6 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                                    <span>Generating Magic...</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="h-7 w-7" />
                                    <span>Create Flashcards</span>
                                </>
                            )}
                        </div>
                        
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 opacity-0 hover:opacity-20 transition-opacity duration-500"></div>
                    </motion.button>

                    {/* Progress Indicator */}
                    <AnimatePresence>
                        {isLoading && (
                            <ProgressIndicator progress={uploadProgress} step={currentStep} />
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
                                <svg className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <p className="text-red-300 font-semibold">Generation Failed</p>
                                    <p className="text-red-200/80 text-sm mt-1">{error}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Right Panel - Viewer/Saved Sets */}
                <motion.div 
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl min-h-[600px]"
                >
                    <AnimatePresence mode="wait">
                        {view === 'viewer' && flashcards.length > 0 ? (
                            <motion.div 
                                key="viewer" 
                                initial={{opacity: 0, y: 20}} 
                                animate={{opacity: 1, y: 0}} 
                                exit={{opacity: 0, y: -20}}
                                className="h-full flex flex-col"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                                        Your Flashcards
                                    </h3>
                                    <motion.button 
                                        onClick={() => setView('generate')} 
                                        className="text-cyan-300 hover:text-cyan-200 font-medium flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        ← Back to Generator
                                    </motion.button>
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                    <FlashcardViewer cards={flashcards} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} />
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="saved" 
                                initial={{opacity: 0, y: 20}} 
                                animate={{opacity: 1, y: 0}} 
                                exit={{opacity: 0, y: -20}}
                            >
                                <h3 className="text-2xl font-bold mb-8 bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                                    Saved Collections
                                </h3>
                                <SavedSetsList sets={savedSets} onLoad={loadSet} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
};

// --- Enhanced Sub-Components (unchanged) ---
const SavedSetsList = ({ sets, onLoad }) => {
    if (sets.length === 0) {
        return (
            <div className="text-center py-16">
                <BookOpenIcon className="h-24 w-24 mx-auto text-slate-500/50 mb-6" />
                <p className="text-slate-400 text-xl mb-2">No flashcard sets yet</p>
                <p className="text-slate-500">Create your first set to get started!</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {sets.map((set, index) => (
                <motion.button 
                    key={set._id} 
                    onClick={() => onLoad(set)}
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
                                {set.topic}
                            </p>
                            <p className="text-sm text-slate-400 mt-1">
                                {new Date(set.createdAt).toLocaleDateString()} • {set.flashcards?.length || 0} cards
                            </p>
                        </div>
                    </div>
                    <ChevronRightIcon className="h-6 w-6 text-slate-500 group-hover:text-cyan-400 transition-colors"/>
                </motion.button>
            ))}
        </div>
    );
};

const FlashcardViewer = ({ cards, currentIndex, setCurrentIndex }) => {
    if (!cards || cards.length === 0) return null;
    
    return (
        <div className="flex flex-col items-center justify-center gap-8 w-full">
            <FlippableCard frontContent={cards[currentIndex].question} backContent={cards[currentIndex].answer} />
            
            <div className="flex items-center gap-8">
                <motion.button 
                    onClick={() => setCurrentIndex((p) => (p - 1 + cards.length) % cards.length)} 
                    className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors group"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <ArrowLeftIcon className="h-6 w-6 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                </motion.button>
                
                <div className="text-center">
                    <p className="text-2xl font-bold text-white">{currentIndex + 1}</p>
                    <p className="text-sm text-slate-400">of {cards.length}</p>
                </div>
                
                <motion.button 
                    onClick={() => setCurrentIndex((p) => (p + 1) % cards.length)} 
                    className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors group"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <ArrowRightIcon className="h-6 w-6 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                </motion.button>
            </div>
        </div>
    );
};

const FlippableCard = ({ frontContent, backContent }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    
    useEffect(() => { 
        setIsFlipped(false); 
    }, [frontContent]);
    
    return (
        <div className="w-full h-80" style={{ perspective: '1000px' }} onClick={() => setIsFlipped(!isFlipped)}>
            <motion.div 
                className="relative w-full h-full cursor-pointer" 
                style={{ transformStyle: 'preserve-3d' }} 
                initial={false} 
                animate={{ rotateY: isFlipped ? 180 : 0 }} 
                transition={{ duration: 0.8, ease: "easeInOut" }}
                whileHover={{ scale: 1.02 }}
            >
                {/* Front */}
                <div 
                    className="absolute w-full h-full bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 rounded-3xl p-8 flex items-center justify-center text-center shadow-2xl border border-white/20" 
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    <div>
                        <p className="text-2xl font-bold text-white leading-relaxed">{frontContent}</p>
                        <p className="text-cyan-100 text-sm mt-4 opacity-80">Click to reveal answer</p>
                    </div>
                </div>
                
                {/* Back */}
                <div 
                    className="absolute w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500 rounded-3xl p-8 flex items-center justify-center text-center shadow-2xl border border-white/20" 
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                    <div>
                        <p className="text-xl font-semibold text-white leading-relaxed">{backContent}</p>
                        <p className="text-pink-100 text-sm mt-4 opacity-80">Click to see question</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default FlashcardPage;