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

  // Helper to format YYYY-MM-DD
  const formatCellDate = (cell: { year: number; month: number; day: number }) => {
    const y = cell.year;
    const m = String(cell.month + 1).padStart(2, '0');
    const d = String(cell.day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center">
        {WEEKDAYS.map(w => (
          <div
            key={w.key}
            className={`py-3 text-xs font-bold uppercase tracking-wider ${
              w.isWeekend ? 'text-amber-700 bg-amber-50/40' : 'text-slate-600'
            }`}
          >
            <span>{w.label}</span>
            {w.key === 5 && (
              <span className="text-[10px] lowercase block font-normal text-amber-600">
                Weekend
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 flex-1">
        {allCells.map((cell, idx) => {
          const dateStr = formatCellDate(cell);
          const isToday = dateStr === todayStr;
          const dayOfWeek = (startDayOfWeek + idx - prevDays.length) % 7;
          const isFriday = dayOfWeek === 5 || (dayOfWeek + 7) % 7 === 5;

          // Find items matching this day
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
                  ? 'bg-slate-50/40 text-slate-300'
                  : isFriday
                  ? 'bg-amber-50/20'
                  : 'bg-white'
              } hover:bg-indigo-50/30`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                    isToday
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : !cell.isCurrentMonth
                      ? 'text-slate-300'
                      : isFriday
                      ? 'text-amber-800'
                      : 'text-slate-700'
                  }`}
                >
                  {cell.day}
                </span>

                <button
                  onClick={e => {
                    e.stopPropagation();
                    onDayClick(dateStr);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-opacity"
                  title="Add Event"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Items in day */}
              <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                {dayItems.slice(0, 3).map(item => (
                  <div
                    key={item.id}
                    onClick={e => {
                      e.stopPropagation();
                      onItemClick(item);
                    }}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold truncate hover:opacity-90 transition-opacity cursor-pointer border shadow-xs"
                    style={{
                      backgroundColor: `${item.color}15`,
                      color: item.color,
                      borderColor: `${item.color}30`,
                    }}
                    title={`${item.title} (${item.badgeText})`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.title}</span>
                  </div>
                ))}

                {dayItems.length > 3 && (
                  <span className="text-[10px] font-bold text-slate-500 block px-1">
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
