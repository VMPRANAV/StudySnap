import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    ChartPieIcon, 
    QueueListIcon, 
    QuestionMarkCircleIcon,
    ArrowRightOnRectangleIcon,
    UserCircleIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

const Sidebar = ({ isSidebarOpen, setSidebarOpen, user, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: ChartPieIcon, path: '/dashboard' },
        { id: 'flashcards', label: 'Flashcards', icon: QueueListIcon, path: '/flashcards' },
        { id: 'quiz', label: 'Interactive Quiz', icon: QuestionMarkCircleIcon, path: '/quiz' },
    ];

    const handleNavigation = (path) => {
        navigate(path);
        // Close sidebar on mobile after navigation
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    };

    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{
                    x: isSidebarOpen ? 0 : -288,
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                }}
                className={`
                    fixed top-0 left-0 h-screen w-72 z-50
                    bg-slate-900/95 backdrop-blur-xl 
                    border-r border-white/10 
                    flex flex-col
                    shadow-2xl shadow-purple-500/10
                    md:sticky md:z-30
                `}
            >
                {/* Header with Close Button (Mobile Only) */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                        Study Snap
                    </h1>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <XMarkIcon className="h-5 w-5 text-white" />
                    </button>
                </div>

                {/* User Info */}
                {user && (
                    <div className="p-6 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                <UserCircleIcon className="h-7 w-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold truncate text-sm">
                                    {user.username || user.name || 'User'}
                                </p>
                                <p className="text-slate-400 text-xs truncate">
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        
                        return (
                            <motion.button
                                key={item.id}
                                onClick={() => handleNavigation(item.path)}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                                    transition-all duration-200 font-medium
                                    ${isActive 
                                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white border border-cyan-400/30 shadow-lg shadow-cyan-500/20' 
                                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                    }
                                `}
                                whileHover={{ scale: 1.02, x: 4 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Icon className="h-5 w-5 flex-shrink-0" />
                                <span className="truncate">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeIndicator"
                                        className="ml-auto w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </motion.button>
                        );
                    })}
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-white/10">
                    <motion.button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 font-medium"
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
                        <span>Logout</span>
                    </motion.button>
                </div>
            </motion.aside>
        </>
    );
};

export default Sidebar;