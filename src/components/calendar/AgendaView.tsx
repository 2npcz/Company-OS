import React from 'react';
import { Calendar, Clock, MapPin, ExternalLink, User } from 'lucide-react';
import { UnifiedCalendarItem } from '../../types';
import { getCalendarItemTheme } from './CalendarGrid';

interface Props {
  items: UnifiedCalendarItem[];
  onItemClick: (item: UnifiedCalendarItem) => void;
}

export const AgendaView: React.FC<Props> = ({ items, onItemClick }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Group items by date
  const grouped: Record<string, UnifiedCalendarItem[]> = {};
  items.forEach(item => {
    if (!grouped[item.date]) {
      grouped[item.date] = [];
    }
    grouped[item.date].push(item);
  });

  const sortedDates = Object.keys(grouped).sort();

  if (sortedDates.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center space-y-3 transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
          <Calendar size={24} />
        </div>
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Scheduled Items Found</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          There are no events, holidays, leaves, or deadlines scheduled for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map(dateStr => {
        const dateObj = new Date(dateStr);
        const isToday = dateStr === todayStr;
        const dayItems = grouped[dateStr];

        return (
          <div key={dateStr} className="space-y-3">
            {/* Date Header Pill */}
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  isToday
                    ? 'bg-indigo-600 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-sm font-extrabold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                {isToday ? 'Today — ' : ''}
                {dateObj.toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* List of items on this date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
              {dayItems.map(item => {
                const theme = getCalendarItemTheme(item.type);
                return (
                  <div
                    key={item.id}
                    onClick={() => onItemClick(item)}
                    className="bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${theme.badge}`}
                          >
                            {item.badgeText}
                          </span>
                          {item.time && (
                            <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                              <Clock size={11} />
                              {item.time}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
                          {item.title}
                        </h4>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
                      {item.location ? (
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                          <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </span>
                      ) : item.assigneeName ? (
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                          <User size={12} className="text-slate-400" />
                          <span>{item.assigneeName}</span>
                        </span>
                      ) : (
                        <span />
                      )}

                      {item.meetingLink && (
                        <span className="text-indigo-600 dark:text-cyan-400 font-semibold flex items-center gap-1">
                          <span>Video Meet</span>
                          <ExternalLink size={11} />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
