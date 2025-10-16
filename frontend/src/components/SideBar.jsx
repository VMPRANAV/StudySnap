import React from 'react';
import { 
    QueueListIcon, 
    QuestionMarkCircleIcon, 
    SparklesIcon,
    ChartPieIcon,
    XMarkIcon,
    UserCircleIcon,
    ArrowRightOnRectangleIcon
} from '@heroicons/react/24/solid';

const Sidebar = ({ currentPage, setCurrentPage, isSidebarOpen, setSidebarOpen, user, onLogout }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: ChartPieIcon },
        { id: 'flashcards', label: 'Flashcards', icon: QueueListIcon },
        { id: 'quiz', label: 'Interactive Quiz', icon: QuestionMarkCircleIcon },
    ];

    return (
        <aside className={`w-64 bg-black/20 p-6 flex-col border-r border-white/10 transition-transform duration-300 ${
            isSidebarOpen ? 'flex' : 'hidden'
        } md:flex`}>
            {/* Close button for mobile */}
            <div className="flex justify-between items-center mb-12 md:block">
                <div className="text-2xl font-bold text-white flex items-center gap-2">
                    <SparklesIcon className="h-7 w-7 text-cyan-400" />
                    <span>Study Snap</span>
                </div>
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="md:hidden text-white hover:text-gray-300 transition-colors"
                >
                    <XMarkIcon className="h-6 w-6" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col space-y-2 flex-1">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => {
                            setCurrentPage(item.id);
                            // Close sidebar on mobile after selection
                            if (window.innerWidth < 768) {
                                setSidebarOpen(false);
                            }
                        }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                            currentPage === item.id 
                                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg' 
                                : 'text-slate-300 hover:bg-white/10'
                        }`}
                    >
                        <item.icon className="h-6 w-6" />
                        <span className="font-semibold">{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* User Profile Section */}
            {user && (
                <div className="mt-auto pt-6 border-t border-white/10">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center">
                            <UserCircleIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-white font-semibold text-sm truncate">
                                {user.username || user.email}
                            </p>
                            <p className="text-slate-400 text-xs truncate">
                                {user.email}
                            </p>
                        </div>
                    </div>
                    
                    <button
                        onClick={onLogout}
                        className="w-full mt-3 flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-red-500/10 hover:text-red-300 transition-colors duration-200"
                    >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;