import React, { useState } from 'react';
import { Database, Menu, X, LayoutDashboard, Clock, CalendarDays, UserCircle, Sun, Moon } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/notifications/NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SubscriptionBanner } from '../components/subscription';


interface MainLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, currentPath, onNavigate }) => {
  const { user, logout } = useAuth();
  const { darkMode, setDarkModePreference } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (path: string) => {
    onNavigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    onNavigate('dashboard'); // Reset path on logout
  };

  if (!user) return null;

  return (
    <div className="flex bg-[#fcfdfe] min-h-screen relative overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-white focus:font-semibold focus:shadow-lg"
      >
        Skip to content
      </a>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <div className={`fixed h-full z-[70] transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          currentPath={currentPath} 
          onNavigate={handleNavigate} 
          onLogout={handleLogout} 
          role={user.role} 
          user={user}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-80 flex flex-col min-h-screen max-w-full overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/95 dark:bg-[#0b1220]/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 px-4 sm:px-6 md:px-10 sticky top-0 z-40">
           <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 -ml-2 text-slate-500 md:hidden hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all flex-shrink-0"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                 <div className="p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden md:hidden flex-shrink-0">
                    <img src="/img/logo.png" className="w-9 h-9 object-contain" alt="Logo" />
                 </div>
                 <h2 className="font-bold text-lg tracking-tight text-slate-900 dark:text-white md:hidden truncate min-w-0">EcoGlobal Trading BD</h2>
                 <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-cyan-400 border-slate-100 dark:border-slate-700/60 shadow-xs">
                   <Database size={13} className="text-primary dark:text-cyan-400 animate-pulse" />
                   <span className="text-[9px] font-bold uppercase tracking-widest">EcoGlobal BD · Company OS</span>
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => setDarkModePreference(darkMode ? 'light' : 'dark')}
                className="p-2.5 rounded-xl text-slate-500 dark:text-amber-400 hover:text-primary dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all flex-shrink-0"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label="Toggle display theme"
              >
                {darkMode ? <Sun size={20} className="text-amber-400 animate-in spin-in-90 duration-300" /> : <Moon size={20} className="text-slate-600" />}
              </button>
              <NotificationBell onNavigate={handleNavigate} />
              <div
                className="cursor-pointer flex-shrink-0"
                onClick={() => handleNavigate('profile')}
              >
                <img
                  src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`}
                  className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 object-cover ring-2 ring-slate-200 dark:ring-slate-700 hover:ring-primary dark:hover:ring-cyan-400 transition-all shadow-sm flex-shrink-0"
                  alt="Profile"
                  width={40}
                  height={40}
                />
              </div>
           </div>
        </header>

        {/* Subscription Banner - visible to all org users */}
        <SubscriptionBanner onUpgradeClick={() => handleNavigate('upgrade')} userRole={user.role} onExitDemo={handleLogout} />

        {/* Content */}
        <div id="main-content" className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 w-full pb-28 md:pb-12 overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>

        {/* Bottom Navigation (Mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0b1220]/95 backdrop-blur-2xl border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-around p-4 z-50 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lg">
          <button 
            onClick={() => handleNavigate('dashboard')}
            className={`flex flex-col items-center gap-1 transition-all ${currentPath === 'dashboard' ? 'text-primary dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`}
          >
            <LayoutDashboard size={20} className={currentPath === 'dashboard' ? 'scale-110 text-primary dark:text-cyan-400' : ''} />
            <span className="text-[9px] font-semibold uppercase tracking-tighter">Home</span>
          </button>
          <button 
            onClick={() => handleNavigate('attendance-logs')}
            className={`flex flex-col items-center gap-1 transition-all ${currentPath === 'attendance-logs' || currentPath === 'attendance-audit' ? 'text-primary dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`}
          >
            <Clock size={20} className={currentPath === 'attendance-logs' || currentPath === 'attendance-audit' ? 'scale-110 text-primary dark:text-cyan-400' : ''} />
            <span className="text-[9px] font-semibold uppercase tracking-tighter">History</span>
          </button>
          <button 
            onClick={() => handleNavigate('leave')}
            className={`flex flex-col items-center gap-1 transition-all ${currentPath === 'leave' ? 'text-primary dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`}
          >
            <CalendarDays size={20} className={currentPath === 'leave' ? 'scale-110 text-primary dark:text-cyan-400' : ''} />
            <span className="text-[9px] font-semibold uppercase tracking-tighter">Leave</span>
          </button>
          <button 
            onClick={() => handleNavigate('profile')}
            className={`flex flex-col items-center gap-1 transition-all ${currentPath === 'profile' ? 'text-primary dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`}
          >
            <UserCircle size={20} className={currentPath === 'profile' ? 'scale-110 text-primary dark:text-cyan-400' : ''} />
            <span className="text-[9px] font-semibold uppercase tracking-tighter">Account</span>
          </button>
        </nav>
      </main>
    </div>
  );
};

export default MainLayout;
