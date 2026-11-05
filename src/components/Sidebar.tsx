
import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BarChart3,
  Settings,
  LogOut,
  Network,
  UserCircle,
  ChevronRight,
  List,
  History,
  Shield,
  ClipboardCheck,
  Megaphone,
  Bell,
  Cpu,
  Briefcase,
  Calendar,
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  role: string;
  user?: any;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate, onLogout, role, user }) => {
  const isSuperAdmin = role === 'SUPER_ADMIN';

  // Super Admin has a different menu
  const superAdminMenuItems = [
    { id: 'super-admin', label: 'Organizations', icon: Shield, roles: ['SUPER_ADMIN'] },
    { id: 'profile', label: 'My Profile', icon: UserCircle, roles: ['SUPER_ADMIN'] },
  ];

  const regularMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'calendar', label: 'Company Calendar', icon: Calendar, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'tasks', label: 'Work & Tasks', icon: Briefcase, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'profile', label: 'My Profile', icon: UserCircle, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'attendance-logs', label: 'My Attendance', icon: History, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'attendance-audit', label: 'Attendance Audit', icon: List, roles: ['ADMIN', 'HR', 'MANAGER'] },
    { id: 'attendance-devices', label: 'Biometric Terminals', icon: Cpu, roles: ['ADMIN', 'HR'] },
    { id: 'leave', label: 'Leave', icon: CalendarDays, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'admin-notifications', label: 'Notifications', icon: Bell, roles: ['ADMIN', 'HR'] },
    { id: 'employees', label: 'Team Directory', icon: Users, roles: ['ADMIN', 'HR', 'MANAGER'] },
    { id: 'performance-review', label: 'Performance', icon: ClipboardCheck, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'organization', label: 'Organization', icon: Network, roles: ['ADMIN', 'HR'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'HR'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['ADMIN', 'HR'] },
  ];

  const menuItems = isSuperAdmin ? superAdminMenuItems : regularMenuItems;
  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-80 bg-white dark:bg-[#0b1220] h-screen flex flex-col border-r border-slate-100 dark:border-slate-800/80 shadow-sm relative z-50">
      {/* Company Brand Header */}
      <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-100/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="p-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-xs flex-shrink-0">
          <img src="/img/logo.png" alt="EcoGlobal Logo" className="w-8 h-8 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xs font-bold text-slate-900 dark:text-white truncate tracking-tight">EcoGlobal Trading BD</h1>
          <p className="text-[10px] font-bold text-primary dark:text-cyan-400 uppercase tracking-widest">Company OS</p>
        </div>
      </div>

      {/* Profile Header */}
      <div className="p-10 pb-8 flex flex-col items-center text-center">
        <div className="relative mb-4">
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`}
            className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 shadow-xl bg-slate-50 dark:bg-slate-800 object-cover"
            alt="Profile"
          />
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-primary dark:bg-cyan-400 border-4 border-white dark:border-slate-900 rounded-full shadow-xs"></div>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white leading-tight">{user?.name || 'User Name'}</h2>
        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">{user?.designation || 'Specialist'}</p>
        <div className="w-full h-px bg-slate-100 dark:bg-slate-800/80 mt-8"></div>
      </div>

      {/* Navigation + Sign Out (all scrollable) */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
        {filteredItems.map((item) => (
          <div key={item.id} className="space-y-1">
            <button
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 relative group ${
                currentPath === item.id
                  ? 'bg-primary-light/50 text-primary dark:bg-cyan-500/10 dark:text-cyan-400 dark:border dark:border-cyan-500/20 shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-4">
                {currentPath === item.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary dark:bg-cyan-400 rounded-r-full shadow-sm dark:shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>
                )}
                <item.icon size={22} className={currentPath === item.id ? 'text-primary dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white'} />
                <span className="font-bold text-sm tracking-tight">{item.label}</span>
              </div>
              <ChevronRight size={16} className={`transition-all duration-300 ${currentPath === item.id ? 'text-primary dark:text-cyan-400 opacity-100 translate-x-0' : 'text-slate-200 dark:text-slate-600 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
            </button>
          </div>
        ))}

        {/* Sign Out */}
        <div className="pt-4 pb-2 space-y-4">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-3xl group hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-900/60 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-slate-800 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/60 rounded-2xl shadow-sm text-slate-600 dark:text-slate-300 group-hover:text-rose-600 dark:group-hover:text-rose-300 transition-all duration-200">
                <LogOut size={20} />
              </div>
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-300 uppercase tracking-tight transition-colors">Sign Out</span>
            </div>
            <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-rose-500 dark:group-hover:text-rose-400 group-hover:translate-x-1 transition-all duration-200" />
          </button>

          <div className="text-center">
            <p className="text-[10px] font-semibold text-slate-300 dark:text-slate-600 uppercase tracking-[0.25em]">EcoGlobal Trading BD · OS</p>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
