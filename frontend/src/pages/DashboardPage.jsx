import React from 'react';
import { motion } from 'framer-motion';
import { 
    BookOpenIcon,
    ChartBarIcon,
    CheckCircleIcon,
    ClockIcon,
    PlusCircleIcon
} from '@heroicons/react/24/solid';

// --- Hardcoded Data for the Dashboard ---
const dashboardData = {
    userName: "Alex",
    stats: [
        { title: "Quizzes Taken", value: "14", icon: BookOpenIcon, color: "cyan" },
        { title: "Average Score", value: "88%", icon: CheckCircleIcon, color: "green" },
        { title: "Study Time", value: "12h 45m", icon: ClockIcon, color: "purple" },
        { title: "Flashcard Sets", value: "8", icon: ChartBarIcon, color: "pink" },
    ],
    recentActivity: [
        { id: 1, type: 'quiz', topic: "Quantum Physics", score: "9/10", time: "2h ago" },
        { id: 2, type: 'flashcards', topic: "JS Data Structures", score: "20 cards", time: "1d ago" },
        { id: 3, type: 'quiz', topic: "Roman Empire History", score: "7/10", time: "3d ago" },
    ],
    performance: [ 
        { label: "Jun", value: 75 },
        { label: "Jul", value: 82 },
        { label: "Aug", value: 78 },
        { label: "Sep", value: 91 },
        { label: "Oct", value: 88 } 
    ]
};

// --- Main Dashboard Component ---
const DashboardPage = ({ isSidebarOpen }) => { // Add isSidebarOpen prop
    return (
        <div className={`max-w-7xl mx-auto transition-all duration-300 ${isSidebarOpen ? 'px-4' : 'px-6'}`}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-2 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Welcome Back, {dashboardData.userName}!
                </h1>
                <p className="text-lg text-slate-300 font-light">Here's your learning snapshot.</p>
            </motion.div>
            <div className={`grid grid-cols-1 ${isSidebarOpen ? 'lg:grid-cols-3' : 'xl:grid-cols-3'} gap-8 transition-all duration-300`}>
                <div className={`${isSidebarOpen ? 'lg:col-span-2' : 'xl:col-span-2'} space-y-8`}>
                    <div className={`grid ${isSidebarOpen ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 lg:grid-cols-4'} gap-6 transition-all duration-300`}>
                        {dashboardData.stats.map((stat, i) => ( <StatCard key={i} stat={stat} index={i} /> ))}
                    </div>
                    <PerformanceChart data={dashboardData.performance} />
                </div>
                <div className={`${isSidebarOpen ? 'lg:col-span-1' : 'xl:col-span-1'}`}>
                    <RecentActivityList activities={dashboardData.recentActivity} />
                </div>
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.8 } }} className="mt-8 bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-white">Ready for your next challenge?</h3>
                <div className="flex flex-wrap justify-center gap-4">
                    <button className="px-5 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors flex items-center gap-2">
                        <BookOpenIcon className="h-5 w-5" /><span>View Quizzes</span>
                    </button>
                    <button className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
                        <PlusCircleIcon className="h-6 w-6" /><span>Create New Quiz</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// --- Sub-Components ---

const StatCard = ({ stat, index }) => {
    const colors = { cyan: 'from-cyan-500/80 to-blue-500/80', green: 'from-green-500/80 to-emerald-500/80', purple: 'from-purple-500/80 to-indigo-500/80', pink: 'from-pink-500/80 to-rose-500/80' };
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, transition: { delay: index * 0.1 + 0.1 } }} className="bg-white/5 p-5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
            <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${colors[stat.color]}`}></div>
            <stat.icon className="h-8 w-8 text-slate-300 mb-4" />
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-slate-400">{stat.title}</p>
        </motion.div>
    );
};

const PerformanceChart = ({ data }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.4 } }} className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl">
        <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">Performance Overview</h3>
        <div className="flex justify-around items-end gap-4 h-48">
            {data.map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <motion.div className="w-full bg-gradient-to-b from-cyan-500 to-purple-500 rounded-t-lg" initial={{ height: '0%' }} animate={{ height: `${item.value}%`, transition: { delay: i * 0.1 + 0.5, duration: 0.8, ease: 'easeOut' } }}></motion.div>
                    <p className="text-xs font-medium text-slate-400">{item.label}</p>
                </div>
            ))}
        </div>
    </motion.div>
);

const RecentActivityList = ({ activities }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.6 } }} className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl h-full">
        <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">Recent Activity</h3>
        <div className="space-y-4">
            {activities.map((activity, i) => (
                <motion.div key={activity.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.1 + 0.7 } }} className="flex items-center gap-4 group">
                    <div className={`flex-shrink-0 p-3 rounded-full ${activity.type === 'quiz' ? 'bg-cyan-500/10' : 'bg-pink-500/10'}`}>
                        {activity.type === 'quiz' ? <CheckCircleIcon className="h-6 w-6 text-cyan-400" /> : <BookOpenIcon className="h-6 w-6 text-pink-400" />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="font-semibold text-white truncate">{activity.topic}</p>
                        <p className="text-sm text-slate-400">{activity.score}</p>
                    </div>
                    <p className="text-xs text-slate-500 flex-shrink-0">{activity.time}</p>
                </motion.div>
            ))}
        </div>
    </motion.div>
);

export default DashboardPage;

