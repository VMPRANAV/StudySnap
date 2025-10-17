import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentArrowUpIcon,
  SparklesIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BookOpenIcon,
  ClockIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const backend = import.meta.env.VITE_URL || 'http://localhost:3000';

// Progress Indicator Component
const ProgressIndicator = ({ progress, step }) => {
  return (
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
};

const FlashcardPage = () => {
  const [file, setFile] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedSets, setSavedSets] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [error, setError] = useState('');

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

  // Fetch saved flashcard sets on component mount
  useEffect(() => {
    fetchSavedSets();
  }, []);

  const fetchSavedSets = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.log('No auth token found');
        return;
      }

      const response = await fetch(`${backend}/api/flashcards`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setSavedSets(data);
      } else if (response.status === 401) {
        setError('Session expired. Please login again.');
      }
    } catch (error) {
      console.error('Error fetching flashcard sets:', error);
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
      const response = await fetch(`${backend}/api/flashcards/upload`, {
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

  const handleGenerateFlashcards = async () => {
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
      const response = await fetch(`${backend}/api/flashcards/generate`, {
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
        setFlashcards(data.flashcards || []);
        setCurrentIndex(0);
        setGenerateProgress(100);
        fetchSavedSets();
        setTimeout(() => {
          setIsGenerating(false);
          setGenerateProgress(0);
        }, 500);
      } else if (response.status === 401) {
        setError('Session expired. Please login again.');
        setIsGenerating(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to generate flashcards');
        setIsGenerating(false);
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Generation error:', error);
      setError('Network error. Please try again.');
      setIsGenerating(false);
    }
  };

  const handleLoadSet = (set) => {
    setFlashcards(set.flashcards || []);
    setCurrentIndex(0);
    setError('');
  };

  const handleStartNew = () => {
    setFile(null);
    setFileId(null);
    setPrompt('');
    setFlashcards([]);
    setCurrentIndex(0);
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
          AI Flashcards
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
          {flashcards.length === 0 ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Create New Set */}
              <div className="space-y-6">
                <motion.div
                  className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl"
                  whileHover={{ scale: 1.01 }}
                >
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <SparklesIcon className="h-7 w-7 text-cyan-400" />
                    Create New Set
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
                        <div className="mt-4">
                          <ProgressIndicator
                            progress={uploadProgress}
                            step="Uploading PDF..."
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-3 font-medium">Topic/Prompt</label>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="E.g., Create flashcards on key concepts from this document"
                        className="w-full bg-white/5 border border-white/20 rounded-2xl p-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all resize-none"
                        rows="4"
                        disabled={isGenerating}
                      />
                    </div>

                    <motion.button
                      onClick={handleGenerateFlashcards}
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
                          Generate Flashcards
                        </>
                      )}
                    </motion.button>

                    {isGenerating && (
                      <ProgressIndicator
                        progress={generateProgress}
                        step="AI is creating your flashcards..."
                      />
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Saved Sets */}
              <SavedSetsList sets={savedSets} onLoad={handleLoadSet} />
            </motion.div>
          ) : (
            <motion.div
              key="viewer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <FlashcardViewer
                cards={flashcards}
                currentIndex={currentIndex}
                setCurrentIndex={setCurrentIndex}
              />
              <div className="text-center mt-8">
                <motion.button
                  onClick={handleStartNew}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold hover:shadow-2xl hover:shadow-purple-500/25 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Create New Set
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Enhanced Sub-Components ---
const SavedSetsList = ({ sets, onLoad }) => (
  <motion.div
    className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
  >
    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
      <BookOpenIcon className="h-7 w-7 text-purple-400" />
      Saved Sets
    </h2>

    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
      {sets.length === 0 ? (
        <p className="text-slate-400 text-center py-8">No saved flashcard sets yet</p>
      ) : (
        sets.map((set) => (
          <motion.div
            key={set._id}
            className="bg-white/5 rounded-xl p-5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
            whileHover={{ scale: 1.02, x: 5 }}
            onClick={() => onLoad(set)}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-white font-semibold line-clamp-2">{set.topic}</h3>
              <span className="text-cyan-400 text-sm font-mono bg-cyan-400/10 px-2 py-1 rounded">
                {set.flashcards.length} cards
              </span>
            </div>
            <p className="text-slate-400 text-sm flex items-center gap-2">
              <ClockIcon className="h-4 w-4" />
              {new Date(set.createdAt).toLocaleDateString()}
            </p>
          </motion.div>
        ))
      )}
    </div>
  </motion.div>
);

const FlashcardViewer = ({ cards, currentIndex, setCurrentIndex }) => {
  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : cards.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < cards.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <p className="text-slate-300 text-lg mb-4">
          Card {currentIndex + 1} of {cards.length}
        </p>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <FlippableCard
        frontContent={cards[currentIndex].question}
        backContent={cards[currentIndex].answer}
      />

      <div className="flex justify-center items-center gap-6 mt-8">
        <motion.button
          onClick={handlePrevious}
          className="p-4 bg-white/10 rounded-full hover:bg-white/20 transition-all"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeftIcon className="h-6 w-6 text-white" />
        </motion.button>

        <span className="text-slate-400 font-mono">
          {currentIndex + 1} / {cards.length}
        </span>

        <motion.button
          onClick={handleNext}
          className="p-4 bg-white/10 rounded-full hover:bg-white/20 transition-all"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronRightIcon className="h-6 w-6 text-white" />
        </motion.button>
      </div>
    </div>
  );
};

const FlippableCard = ({ frontContent, backContent }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="perspective-1000">
      <motion.div
        className="relative w-full h-96 cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 backdrop-blur-xl rounded-3xl p-8 border border-white/20 flex items-center justify-center"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-4 uppercase tracking-wide">Question</p>
            <p className="text-white text-2xl font-bold">{frontContent}</p>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-3xl p-8 border border-white/20 flex items-center justify-center"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-4 uppercase tracking-wide">Answer</p>
            <p className="text-white text-xl leading-relaxed">{backContent}</p>
          </div>
        </div>
      </motion.div>

      <p className="text-center text-slate-400 text-sm mt-4">
        Click card to flip
      </p>
    </div>
  );
};

export default FlashcardPage;