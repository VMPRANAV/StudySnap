import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpenIcon,
  LightBulbIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon
} from "@heroicons/react/24/outline";

const LandingPage = ({ onStartLearning, onLogin }) => {
  const [showContactForm, setShowContactForm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { delayChildren: 0.3, staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  const handleStartLearning = () => {
    setShowAuthModal(true);
    setIsLoginMode(true);
  };

  const handleAuthSuccess = (user) => {
    if (onLogin) {
      onLogin(user);
    }
    if (onStartLearning) {
      onStartLearning('dashboard');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white overflow-x-hidden">
      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center px-4 md:px-8 py-6"
      >
        <div className="flex items-center gap-3">
          <SparklesIcon className="h-8 w-8 text-cyan-400" />
          <h2 className="text-2xl font-bold text-white">Study Snap</h2>
        </div>
        
        <div className="flex items-center gap-4">
          <motion.button
            onClick={() => {
              setShowAuthModal(true);
              setIsLoginMode(true);
            }}
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            whileHover={{ scale: 1.05 }}
          >
            Login
          </motion.button>
          <motion.button
            onClick={() => {
              setShowAuthModal(true);
              setIsLoginMode(false);
            }}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg hover:from-cyan-600 hover:to-purple-700 transition-all"
            whileHover={{ scale: 1.05 }}
          >
            Sign Up
          </motion.button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section
        id="home"
        className="relative flex flex-col justify-center items-center min-h-[calc(100vh-100px)] px-4 md:px-8 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-6xl mx-auto text-center">
          <motion.div variants={itemVariants} className="mb-12">
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight"
            >
              AI-Powered
              <span className="block bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Learning Companion
              </span>
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl md:text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed font-light"
            >
              Transform your study materials into interactive flashcards,
              summaries, and practice questions with AI.
            </motion.p>
          </motion.div>

          {/* Features */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mb-12 px-2"
          >
            {/* Feature 1 */}
            <motion.div
              className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 md:p-8 border border-white/10 hover:bg-white/10 transition-all duration-300 group shadow-2xl"
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <div className="bg-gradient-to-br from-cyan-500 to-blue-500 w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center mb-6 mx-auto">
                <BookOpenIcon className="h-8 w-8 md:h-10 md:w-10 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-4">
                Smart Flashcards
              </h3>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                AI-generated flashcards from your study materials with intelligent spaced repetition.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 md:p-8 border border-white/10 hover:bg-white/10 transition-all duration-300 group shadow-2xl"
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center mb-6 mx-auto">
                <LightBulbIcon className="h-8 w-8 md:h-10 md:w-10 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-4">
                Concise Summaries
              </h3>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                Get key insights and main concepts quickly with AI-powered summarization.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 md:p-8 border border-white/10 hover:bg-white/10 transition-all duration-300 group shadow-2xl sm:col-span-2 md:col-span-1"
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <div className="bg-gradient-to-br from-emerald-500 to-green-500 w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center mb-6 mx-auto">
                <QuestionMarkCircleIcon className="h-8 w-8 md:h-10 md:w-10 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-4">
                Practice Questions
              </h3>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                MCQ, 2-mark, 7-mark & 14-mark questions tailored to your content and difficulty level.
              </p>
            </motion.div>
          </motion.div>

          {/* CTA */}
          <motion.div variants={itemVariants}>
            <motion.button
              onClick={handleStartLearning}
              className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white px-10 md:px-16 py-4 md:py-5 rounded-2xl text-lg md:text-xl font-bold hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 relative overflow-hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative z-10 flex items-center gap-3">
                <SparklesIcon className="h-6 w-6 md:h-7 md:w-7" />
                <span>Start Learning</span>
              </div>
              
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 opacity-0 hover:opacity-20 transition-opacity duration-500"></div>
            </motion.button>
          </motion.div>
        </div>
      </motion.section>

      {/* About Section */}
      <section
        id="about"
        className="min-h-screen flex items-center justify-center px-4 md:px-8 bg-black/20"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          >
            {/* Left side - Text content */}
            <div className="space-y-8">
              <motion.h2 
                variants={itemVariants}
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6"
              >
                About 
                <span className="block bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Study Snap
                </span>
              </motion.h2>
              <motion.p 
                variants={itemVariants}
                className="text-lg md:text-xl text-slate-300 leading-relaxed font-light"
              >
                Study Snap revolutionizes the way you learn by leveraging cutting-edge AI technology 
                to transform your study materials into engaging, interactive learning experiences.
              </motion.p>
              <motion.p 
                variants={itemVariants}
                className="text-lg md:text-xl text-slate-300 leading-relaxed font-light"
              >
                Our platform adapts to your learning style and helps you achieve better results faster 
                through personalized flashcards, intelligent summaries, and adaptive practice questions.
              </motion.p>
              <motion.button
                variants={itemVariants}
                onClick={() => setShowContactForm(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 md:px-10 py-4 rounded-2xl text-base md:text-lg font-bold hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-300 shadow-2xl"
                whileHover={{ scale: 1.05 }}
              >
                Get in Touch
              </motion.button>
            </div>

            {/* Right side - Visual element */}
            <motion.div 
              variants={itemVariants}
              className="relative"
            >
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl p-4 text-center">
                    <BookOpenIcon className="h-8 w-8 mx-auto mb-2 text-cyan-400" />
                    <p className="text-sm font-semibold text-white">Flashcards</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 text-center">
                    <LightBulbIcon className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                    <p className="text-sm font-semibold text-white">Summaries</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl p-4 text-center">
                    <QuestionMarkCircleIcon className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                    <p className="text-sm font-semibold text-white">Quizzes</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl p-4 text-center">
                    <SparklesIcon className="h-8 w-8 mx-auto mb-2 text-orange-400" />
                    <p className="text-sm font-semibold text-white">AI Magic</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Contact Form Modal */}
      {showContactForm && (
        <ContactModal onClose={() => setShowContactForm(false)} />
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          isLoginMode={isLoginMode} 
          setIsLoginMode={setIsLoginMode}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
};

// Contact Modal Component (unchanged)
const ContactModal = ({ onClose }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Thank you for your message! We will be in touch shortly.");
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative bg-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-8 max-w-md w-full border border-white/10 max-h-[90vh] overflow-y-auto shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-white text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Get In Touch
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              name="name"
              placeholder="Your Name"
              required
              className="w-full bg-white/5 border border-white/20 rounded-xl py-4 px-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all duration-300 text-sm md:text-base"
            />
          </div>
          <div>
            <input
              type="email"
              name="email"
              placeholder="Your Email"
              required
              className="w-full bg-white/5 border border-white/20 rounded-xl py-4 px-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all duration-300 text-sm md:text-base"
            />
          </div>
          <div>
            <input
              type="text"
              name="subject"
              placeholder="Subject"
              required
              className="w-full bg-white/5 border border-white/20 rounded-xl py-4 px-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all duration-300 text-sm md:text-base"
            />
          </div>
          <div>
            <textarea
              name="message"
              placeholder="Your Message"
              rows="4"
              required
              className="w-full bg-white/5 border border-white/20 rounded-xl py-4 px-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all duration-300 resize-none text-sm md:text-base"
            ></textarea>
          </div>
          <div className="text-center">
            <motion.button
              type="submit"
              className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white px-8 md:px-10 py-4 rounded-2xl text-base md:text-lg font-bold hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 w-full md:w-auto relative overflow-hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                <span>Send Message</span>
                <PaperAirplaneIcon className="h-5 w-5" />
              </div>
              
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 opacity-0 hover:opacity-20 transition-opacity duration-500"></div>
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Auth Modal Component - UPDATED FOR USERNAME/PASSWORD LOGIN
const AuthModal = ({ isLoginMode, setIsLoginMode, onClose, onAuthSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user starts typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = isLoginMode ? 'login' : 'register';
      const url = `${import.meta.env.VITE_URL}/api/auth/${endpoint}`;
      
      const payload = isLoginMode 
        ? { username: formData.username, password: formData.password }
        : { username: formData.username, email: formData.email, password: formData.password };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user info
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Call success callback
        onAuthSuccess(data.user);
        onClose();
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative bg-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-8 max-w-md w-full border border-white/10 shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-white text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            {isLoginMode ? 'Welcome Back' : 'Join Study Snap'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username field - always shown */}
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              name="username"
              placeholder="Username"
              required
              value={formData.username}
              onChange={handleInputChange}
              className="w-full bg-white/5 border border-white/20 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all duration-300"
            />
          </div>

          {/* Email field - only shown in signup mode */}
          {!isLoginMode && (
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/20 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all duration-300"
              />
            </div>
          )}

          {/* Password field */}
          <div className="relative">
            <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Password"
              required
              value={formData.password}
              onChange={handleInputChange}
              className="w-full bg-white/5 border border-white/20 rounded-xl py-4 pl-12 pr-12 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all duration-300"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-500/10 border border-red-400/30 rounded-lg"
            >
              <p className="text-red-300 text-sm text-center">{error}</p>
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white py-4 rounded-2xl text-lg font-bold hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isLoading ? 1 : 0.98 }}
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  <span>{isLoginMode ? 'Signing In...' : 'Creating Account...'}</span>
                </>
              ) : (
                <span>{isLoginMode ? 'Sign In' : 'Create Account'}</span>
              )}
            </div>
            
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 opacity-0 hover:opacity-20 transition-opacity duration-500"></div>
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400">
            {isLoginMode ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setError('');
                setFormData({ username: '', email: '', password: '' });
              }}
              className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
            >
              {isLoginMode ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LandingPage;