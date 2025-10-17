import React from 'react';
import { Bars3Icon, UserCircleIcon } from '@heroicons/react/24/solid';

const MobileNav = ({ setSidebarOpen, isSidebarOpen, user }) => {
    return (
        <div className=" flex items-center justify-between p-4 bg-black/10 border-b border-white/10 sticky top-0 z-30 backdrop-blur-xl">
            <button
                onClick={() => setSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
                <Bars3Icon className="h-6 w-6 text-white" />
            </button>
            
            <h1 className=" absolute left-1/2 -translate-x-1/2 text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Study Snap
            </h1>
            
            
        </div>
    );
};

export default MobileNav;