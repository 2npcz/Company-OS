import React from 'react';
import { Calendar, Clock, MapPin, ExternalLink, User } from 'lucide-react';
import { UnifiedCalendarItem } from '../../types';

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
      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-2">
        <Calendar size={36} className="mx-auto text-slate-300" />
        <h4 className="text-sm font-bold text-slate-700">No Scheduled Items Found</h4>
        <p className="text-xs text-slate-400">
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
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isToday
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-200 text-slate-800'
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
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* List of items on this date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
              {dayItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => onItemClick(item)}
                  className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white"
                          style={{ backgroundColor: item.color }}
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
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {item.title}
                      </h4>
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                    {item.location ? (
                      <span className="flex items-center gap-1 text-slate-600 truncate max-w-[200px]">
                        <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </span>
                    ) : item.assigneeName ? (
                      <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <User size={12} className="text-slate-400" />
                        <span>{item.assigneeName}</span>
                      </span>
                    ) : (
                      <span />
                    )}

                    {item.meetingLink && (
                      <span className="text-indigo-600 font-semibold flex items-center gap-1">
                        <span>Video Meet</span>
                        <ExternalLink size={11} />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
