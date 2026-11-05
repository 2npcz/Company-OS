import React from 'react';
import { Plus } from 'lucide-react';
import { UnifiedCalendarItem } from '../../types';

interface Props {
  currentDate: Date;
  items: UnifiedCalendarItem[];
  onItemClick: (item: UnifiedCalendarItem) => void;
  onDayClick: (dateStr: string) => void;
}

const WEEKDAYS = [
  { key: 0, label: 'Sun' },
  { key: 1, label: 'Mon' },
  { key: 2, label: 'Tue' },
  { key: 3, label: 'Wed' },
  { key: 4, label: 'Thu' },
  { key: 5, label: 'Fri', isWeekend: true },
  { key: 6, label: 'Sat', isWeekend: true },
];

export const getCalendarItemTheme = (type: string) => {
  switch (type) {
    case 'EVENT':
      return {
        pill: 'bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/50 hover:bg-indigo-100/90 dark:hover:bg-indigo-900/60',
        dot: 'bg-indigo-500 dark:bg-indigo-400',
        badge: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60',
      };
    case 'HOLIDAY':
      return {
        pill: 'bg-amber-50/90 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/50 hover:bg-amber-100/90 dark:hover:bg-amber-900/60',
        dot: 'bg-amber-500 dark:bg-amber-400',
        badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60',
      };
    case 'LEAVE':
      return {
        pill: 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/50 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/60',
        dot: 'bg-emerald-500 dark:bg-emerald-400',
        badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60',
      };
    case 'TASK':
      return {
        pill: 'bg-sky-50/90 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200/70 dark:border-sky-800/50 hover:bg-sky-100/90 dark:hover:bg-sky-900/60',
        dot: 'bg-sky-500 dark:bg-sky-400',
        badge: 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/60',
      };
    case 'PROJECT':
      return {
        pill: 'bg-purple-50/90 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200/70 dark:border-purple-800/50 hover:bg-purple-100/90 dark:hover:bg-purple-900/60',
        dot: 'bg-purple-500 dark:bg-purple-400',
        badge: 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60',
      };
    default:
      return {
        pill: 'bg-slate-50/90 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700/60',
        dot: 'bg-slate-500 dark:bg-slate-400',
        badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
      };
  }
};

export const CalendarGrid: React.FC<Props> = ({
  currentDate,
  items,
  onItemClick,
  onDayClick,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of current month & total days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat

  // Days from previous month to fill the first row
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevDays = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    prevDays.push({
      day: prevMonthLastDay - i,
      month: month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false,
    });
  }

  // Days of current month
  const currentMonthDays = [];
  for (let i = 1; i <= totalDays; i++) {
    currentMonthDays.push({
      day: i,
      month,
      year,
      isCurrentMonth: true,
    });
  }

  // Days from next month to complete the 35 or 42 grid cells
  const remainingCells = 42 - (prevDays.length + currentMonthDays.length);
  const nextDays = [];
  for (let i = 1; i <= remainingCells; i++) {
    nextDays.push({
      day: i,
      month: month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false,
    });
  }

  const allCells = [...prevDays, ...currentMonthDays, ...nextDays];
  const todayStr = new Date().toISOString().split('T')[0];

  const formatCellDate = (cell: { year: number; month: number; day: number }) => {
    const y = cell.year;
    const m = String(cell.month + 1).padStart(2, '0');
    const d = String(cell.day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-center">
        {WEEKDAYS.map(w => (
          <div
            key={w.key}
            className={`py-3.5 text-xs font-bold uppercase tracking-wider ${
              w.isWeekend
                ? 'text-amber-700 dark:text-amber-400 bg-amber-500/[0.04] dark:bg-amber-950/20'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <span>{w.label}</span>
            {w.key === 5 && (
              <span className="text-[9px] lowercase block font-semibold text-amber-600 dark:text-amber-400/80 tracking-normal mt-0.5">
                Weekend
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/70 flex-1">
        {allCells.map((cell, idx) => {
          const dateStr = formatCellDate(cell);
          const isToday = dateStr === todayStr;
          const dayOfWeek = (startDayOfWeek + idx - prevDays.length) % 7;
          const isFriday = dayOfWeek === 5 || (dayOfWeek + 7) % 7 === 5;

          const dayItems = items.filter(item => {
            if (item.date === dateStr) return true;
            if (item.endDate && dateStr >= item.date && dateStr <= item.endDate) return true;
            return false;
          });

          return (
            <div
              key={idx}
              onClick={() => onDayClick(dateStr)}
              className={`min-h-[110px] md:min-h-[125px] p-2 flex flex-col justify-between transition-colors cursor-pointer group relative ${
                !cell.isCurrentMonth
                  ? 'bg-slate-50/30 dark:bg-slate-950/40 text-slate-300 dark:text-slate-600'
                  : isFriday
                  ? 'bg-amber-500/[0.02] dark:bg-amber-950/10'
                  : 'bg-white dark:bg-slate-900'
              } hover:bg-slate-50/90 dark:hover:bg-slate-800/50`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isToday
                      ? 'bg-indigo-600 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-sm font-extrabold ring-2 ring-indigo-200 dark:ring-cyan-900/60'
                      : !cell.isCurrentMonth
                      ? 'text-slate-300 dark:text-slate-600'
                      : isFriday
                      ? 'text-amber-800 dark:text-amber-400'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {cell.day}
                </span>

                <button
                  onClick={e => {
                    e.stopPropagation();
                    onDayClick(dateStr);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                  title="Add Event"
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* Items in day */}
              <div className="space-y-1 mt-1.5 flex-1 overflow-hidden">
                {dayItems.slice(0, 3).map(item => {
                  const theme = getCalendarItemTheme(item.type);
                  return (
                    <div
                      key={item.id}
                      onClick={e => {
                        e.stopPropagation();
                        onItemClick(item);
                      }}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold truncate transition-all cursor-pointer border shadow-xs ${theme.pill}`}
                      title={`${item.title} (${item.badgeText})`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${theme.dot}`} />
                      <span className="truncate">{item.title}</span>
                    </div>
                  );
                })}

                {dayItems.length > 3 && (
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block px-1">
                    +{dayItems.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
