import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Loader2,
  List,
  Grid,
  MapPin,
  Clock,
  User,
  PartyPopper,
  AlertTriangle,
  Briefcase,
} from 'lucide-react';
import {
  UnifiedCalendarItem,
  CompanyEvent,
  Department,
} from '../types';
import { calendarService, BANGLADESH_STANDARD_HOLIDAYS } from '../services/calendar.service';
import { hrService } from '../services/hrService';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { AgendaView } from '../components/calendar/AgendaView';
import { EventModal } from '../components/calendar/EventModal';
import { EventDetailModal } from '../components/calendar/EventDetailModal';
import { useSubscription } from '../context/SubscriptionContext';

interface Props {
  user: any;
  onNavigate?: (path: string, params?: any) => void;
}

export const CompanyCalendar: React.FC<Props> = ({ user, onNavigate }) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'GRID' | 'AGENDA'>('GRID');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [items, setItems] = useState<UnifiedCalendarItem[]>([]);
  const [rawEvents, setRawEvents] = useState<CompanyEvent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Category Filter
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'EVENT' | 'HOLIDAY' | 'LEAVE' | 'WORK'>('ALL');

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CompanyEvent | null>(null);
  const [eventModalDefaultDate, setEventModalDefaultDate] = useState<string | undefined>(undefined);
  const [selectedItem, setSelectedItem] = useState<UnifiedCalendarItem | null>(null);

  const { canPerformAction, subscription } = useSubscription();
  const canWrite = canPerformAction('write');

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // Range: current month plus 7 days pad on each side
      const startRange = new Date(year, month - 1, 20).toISOString();
      const endRange = new Date(year, month + 1, 10).toISOString();

      const [unified, events, depts] = await Promise.all([
        calendarService.getUnifiedCalendar(startRange, endRange),
        calendarService.getEvents(),
        hrService.getDepartments().catch(() => []),
      ]);

      setItems(unified);
      setRawEvents(events);
      setDepartments(depts);
    } catch (err) {
      console.error('[CompanyCalendar] Error loading calendar data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const jumpToToday = () => {
    setCurrentDate(new Date());
  };

  // Filter items
  const filteredItems = items.filter(item => {
    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === 'EVENT') return item.type === 'EVENT';
    if (selectedCategory === 'HOLIDAY') return item.type === 'HOLIDAY';
    if (selectedCategory === 'LEAVE') return item.type === 'LEAVE';
    if (selectedCategory === 'WORK') return item.type === 'TASK' || item.type === 'PROJECT';
    return true;
  });

  // Out of office today
  const outOfOfficeToday = items.filter(i => {
    if (i.type !== 'LEAVE') return false;
    if (i.date === todayStr) return true;
    if (i.endDate && todayStr >= i.date && todayStr <= i.endDate) return true;
    return false;
  });

  // Next Bangladesh Holidays
  const upcomingHolidays = BANGLADESH_STANDARD_HOLIDAYS.filter(h => h.date >= todayStr).slice(0, 3);

  const handleOpenCreateEvent = (dateStr?: string) => {
    setEditingEvent(null);
    setEventModalDefaultDate(dateStr);
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (eventId: string) => {
    const found = rawEvents.find(e => e.id === eventId);
    if (found) {
      setSelectedItem(null);
      setEditingEvent(found);
      setIsEventModalOpen(true);
    }
  };

  const monthTitle = currentDate.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
        <span className="text-sm font-medium">Loading EcoGlobal Trading BD Calendar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Subscription banner if expired */}
      {!canWrite && (
        <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>
            {subscription?.status === 'EXPIRED'
              ? 'Your subscription trial has expired. The calendar is in read-only mode.'
              : 'Action disabled in your current subscription tier.'}
          </span>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 flex-shrink-0">
            <CalendarIcon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Company Calendar</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                EcoGlobal OS
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              EcoGlobal Trading BD • Unified Holidays, Events, Leaves & Project Deadlines
            </p>
          </div>
        </div>

        {/* Controls: Prev/Next Month, View switcher, Add Event */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Navigation Controls */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={prevMonth}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-100 min-w-[120px] text-center">
              {monthTitle}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            onClick={jumpToToday}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition-colors cursor-pointer"
          >
            Today
          </button>

          {/* Grid vs Agenda switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <button
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'GRID' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Month Grid View"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('AGENDA')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'AGENDA' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Agenda List View"
            >
              <List size={16} />
            </button>
          </div>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Refresh calendar"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin text-indigo-600 dark:text-cyan-400' : ''} />
          </button>

          <button
            onClick={() => handleOpenCreateEvent()}
            disabled={!canWrite}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Plus size={16} />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* Filter Categories Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-sm'
              : 'bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <span>All Items</span>
          <span className="text-[10px] opacity-80">({items.length})</span>
        </button>

        <button
          onClick={() => setSelectedCategory('EVENT')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
            selectedCategory === 'EVENT'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900/80 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>Events & Meetings</span>
        </button>

        <button
          onClick={() => setSelectedCategory('HOLIDAY')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
            selectedCategory === 'HOLIDAY'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900/80 text-amber-800 dark:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Bangladesh Holidays</span>
        </button>

        <button
          onClick={() => setSelectedCategory('LEAVE')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
            selectedCategory === 'LEAVE'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900/80 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Out of Office (Leaves)</span>
        </button>

        <button
          onClick={() => setSelectedCategory('WORK')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
            selectedCategory === 'WORK'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900/80 text-sky-800 dark:text-sky-400 hover:bg-sky-50/50 dark:hover:bg-sky-950/40 border border-sky-200/70 dark:border-sky-800/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          <span>Work Deadlines & Milestones</span>
        </button>
      </div>

      {/* Main Grid + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar View (Main 3 cols) */}
        <div className="lg:col-span-3">
          {viewMode === 'GRID' ? (
            <CalendarGrid
              currentDate={currentDate}
              items={filteredItems}
              onItemClick={item => setSelectedItem(item)}
              onDayClick={dateStr => handleOpenCreateEvent(dateStr)}
            />
          ) : (
            <AgendaView
              items={filteredItems}
              onItemClick={item => setSelectedItem(item)}
            />
          )}
        </div>

        {/* Quick Insights Sidebar (1 col) */}
        <div className="space-y-4">
          {/* Out of Office Today Card */}
          <div className="bg-white dark:bg-slate-900/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                <User size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>Out of Office Today</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                {outOfOfficeToday.length}
              </span>
            </div>

            <div className="space-y-2">
              {outOfOfficeToday.map(leave => (
                <div
                  key={leave.id}
                  onClick={() => setSelectedItem(leave)}
                  className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/40 transition-colors cursor-pointer text-xs"
                >
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 block">{leave.title}</span>
                  {leave.description && (
                    <span className="text-emerald-700 dark:text-emerald-400/80 line-clamp-1 mt-0.5">
                      {leave.description}
                    </span>
                  )}
                </div>
              ))}

              {outOfOfficeToday.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                  Full team active. No approved leaves today.
                </p>
              )}
            </div>
          </div>

          {/* Upcoming Bangladesh Holidays */}
          <div className="bg-white dark:bg-slate-900/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
              <PartyPopper size={14} className="text-amber-600 dark:text-amber-400" />
              <span>Upcoming Public Holidays</span>
            </h3>

            <div className="space-y-2">
              {upcomingHolidays.map(hol => (
                <div
                  key={hol.date}
                  className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/70 dark:border-amber-800/40 text-xs space-y-0.5"
                >
                  <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-200">
                    <span>{hol.name}</span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                      {new Date(hol.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400/80 block">{hol.type} Holiday</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Schedule Notice */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-200 block">EcoGlobal Standard Schedule</span>
            <p className="leading-relaxed">
              Standard working hours: 09:00 — 18:00 (Asia/Dhaka). Weekly weekend observed on <strong>Friday</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isEventModalOpen && (
        <EventModal
          mode={editingEvent ? 'edit' : 'create'}
          event={editingEvent}
          defaultDate={eventModalDefaultDate}
          departments={departments}
          onClose={() => {
            setIsEventModalOpen(false);
            setEditingEvent(null);
          }}
          onSaved={() => loadData(true)}
        />
      )}

      {selectedItem && (
        <EventDetailModal
          item={selectedItem}
          userRole={user.role}
          onClose={() => setSelectedItem(null)}
          onEdit={eventId => handleOpenEditEvent(eventId)}
          onDeleted={() => loadData(true)}
          onNavigateToTask={taskId => {
            setSelectedItem(null);
            if (onNavigate) onNavigate('tasks');
          }}
        />
      )}
    </div>
  );
};

export default CompanyCalendar;
