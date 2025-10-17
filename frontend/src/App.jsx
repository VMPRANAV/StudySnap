import React, { useState, useEffect } from 'react';
import Sidebar from './components/SideBar';
import MobileNav from './components/MobileNav';
import DashboardPage from './pages/DashboardPage';
import FlashcardPage from './pages/FlashcardPage';
import QuizPage from './pages/QuizPage';
import LandingPage from './pages/LandingPage';

const App = () => {
    const [currentPage, setCurrentPage] = useState('landing');
    const [isSidebarOpen, setSidebarOpen] = useState(false); // Changed to false by default
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check for existing authentication on app load
    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        
        if (token && savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                setUser(userData);
                setIsAuthenticated(true);
                setCurrentPage('dashboard');
            } catch (error) {
                console.error('Error parsing saved user data:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
        setIsAuthenticated(true);
        setCurrentPage('dashboard');
    };

    const handleLogout = async () => {
        try {
            const token = localStorage.getItem('token');
            
            // Optional: Call backend logout
            if (token) {
                await fetch(`${import.meta.env.VITE_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }).catch(err => console.log('Logout endpoint error:', err));
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setIsAuthenticated(false);
            setCurrentPage('landing');
            setSidebarOpen(false);
        }
    };

    const renderPage = () => {
        if (!isAuthenticated) {
            return (
                <LandingPage 
                    onStartLearning={setCurrentPage} 
                    onLogin={handleLogin}
                />
            );
        }

        switch (currentPage) {
            case 'dashboard':
                return <DashboardPage user={user} />;
            case 'flashcards':
                return <FlashcardPage user={user} />;
            case 'quiz':
                return <QuizPage user={user} />;
            default:
                return <DashboardPage user={user} />;
        }
    };

    // Don't show sidebar and mobile nav on landing page or when not authenticated
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-900 text-white font-sans">
                {renderPage()}
            </div>
        );
    }

    // FIXED: Simplified layout, sidebar renders only once
    return (
        <div className="flex min-h-screen bg-gray-900 text-white font-sans">
            {/* Sidebar - handles its own mobile overlay */}
            <Sidebar 
                currentPage={currentPage} 
                setCurrentPage={setCurrentPage}
                isSidebarOpen={isSidebarOpen}
                setSidebarOpen={setSidebarOpen}
                user={user}
                onLogout={handleLogout}
            />
            
            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen">
                <MobileNav 
                    setSidebarOpen={setSidebarOpen} 
                    isSidebarOpen={isSidebarOpen}
                    user={user}
                />
                <div className="flex-1 p-4 sm:p-6 lg:p-8">
                    {renderPage()}
                </div>
            </main>
        </div>
    );
};

export default App;

