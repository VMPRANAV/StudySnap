import React from 'react';
import { motion } from 'framer-motion';
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
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    };

    return (
        <>
            {/* Backdrop for mobile */}
            {isSidebarOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <motion.div
                initial={{ x: -300 }}
                animate={{ x: isSidebarOpen ? 0 : -300 }}
                className="md:translate-x-0 fixed md:sticky top-0 left-0 h-screen w-72 bg-black/20 backdrop-blur-xl border-r border-white/10 flex flex-col z-50 md:z-0"
            >
                {/* Close button for mobile */}
                <div className="md:hidden flex justify-end p-4">
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <XMarkIcon className="h-6 w-6 text-white" />
                    </button>
                </div>

                {/* Logo */}
                <div className="p-6 border-b border-white/10">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                        Study Snap
                    </h1>
                </div>

                {/* User Info */}
                {user && (
                    <div className="p-6 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center">
                                <UserCircleIcon className="h-7 w-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold truncate">
                                    {user.username || user.name || 'User'}
                                </p>
                                <p className="text-slate-400 text-sm truncate">
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        
                        return (
                            <motion.button
                                key={item.id}
                                onClick={() => handleNavigation(item.path)}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                                    transition-all duration-200
                                    ${isActive 
                                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white border border-cyan-400/30' 
                                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                    }
                                `}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="font-medium">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="ml-auto w-2 h-2 rounded-full bg-cyan-400"
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
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all duration-200"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        <span className="font-medium">Logout</span>
                    </motion.button>
                </div>
            </motion.div>
        </>
    );
};

export default Sidebar;