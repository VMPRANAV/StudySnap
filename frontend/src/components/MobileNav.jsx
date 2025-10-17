import React from 'react';
import { Bars3Icon, UserCircleIcon } from '@heroicons/react/24/solid';

const MobileNav = ({ setSidebarOpen, isSidebarOpen, user }) => {
    return (
        <div className="flex items-center justify-between p-4 md:p-6 bg-black/10 border-b border-white/10 sticky top-0 z-30 backdrop-blur-xl">
            <button
                onClick={() => setSidebarOpen(!isSidebarOpen)}
                className="p-2 md:p-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
                <Bars3Icon className="h-6 w-6 md:h-7 md:w-7 text-white" />
            </button>
            
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Study Snap
            </h1>
            
            {user && (
                <div className="flex items-center gap-2 md:gap-3">
                    <span className="hidden md:block text-sm lg:text-base text-slate-300 font-medium">
                        {user.name || user.username || user.email?.split('@')[0]}
                    </span>
                    <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center">
                        <UserCircleIcon className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-white" />
                    </div>
                </div>
            )}
            
            {!user && (
                <div className="w-8 md:w-10"></div> )}
        </div>
    );
};

export default MobileNav;