import React from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Trash2,
  Edit3,
  User,
  CheckCircle2,
  Briefcase,
  AlertTriangle,
} from 'lucide-react';
import { UnifiedCalendarItem, Role } from '../../types';
import { calendarService } from '../../services/calendar.service';

interface Props {
  item: UnifiedCalendarItem;
  userRole?: Role;
  onClose: () => void;
  onEdit?: (eventId: string) => void;
  onDeleted?: () => void;
  onNavigateToTask?: (taskId: string) => void;
}

export const EventDetailModal: React.FC<Props> = ({
  item,
  userRole,
  onClose,
  onEdit,
  onDeleted,
  onNavigateToTask,
}) => {
  const isCompanyEvent = item.type === 'EVENT' && item.entityId;
  const canManage = userRole === 'ADMIN' || userRole === 'HR' || userRole === 'MANAGER';

  const handleDelete = async () => {
    if (!item.entityId) return;
    if (!window.confirm(`Are you sure you want to delete event "${item.title}"?`)) return;
    const ok = await calendarService.deleteEvent(item.entityId);
    if (ok) {
      if (onDeleted) onDeleted();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header colored banner */}
        <div
          className="p-5 text-white flex items-start justify-between relative"
          style={{ backgroundColor: item.color || '#4f46e5' }}
        >
          <div className="space-y-1 pr-6">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 uppercase tracking-wide">
              {item.badgeText}
            </span>
            <h3 className="text-lg font-bold leading-snug">{item.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Details Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            {/* Date & Time */}
            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0">
                <Calendar size={16} />
              </div>
              <div>
                <span className="font-semibold block text-slate-900 dark:text-white">
                  {new Date(item.date).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                {item.time && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock size={12} /> {item.time}
                  </span>
                )}
              </div>
            </div>

            {/* Location */}
            {item.location && (
              <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0">
                  <MapPin size={16} />
                </div>
                <span className="font-medium">{item.location}</span>
              </div>
            )}

            {/* Meeting Link */}
            {item.meetingLink && (
              <div className="pt-1">
                <a
                  href={item.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl border border-indigo-200/60 dark:border-indigo-800/50 transition-colors"
                >
                  <ExternalLink size={14} />
                  <span>Join Video Meeting</span>
                </a>
              </div>
            )}

            {/* Assignee / Out of office person */}
            {item.assigneeName && (
              <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                {item.assigneeAvatar ? (
                  <img src={item.assigneeAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                    {item.assigneeName[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Team Member</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{item.assigneeName}</span>
                </div>
              </div>
            )}

            {/* Description */}
            {item.description && (
              <div className="space-y-1 pt-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Notes & Info</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
                  {item.description}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            {isCompanyEvent && canManage ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (onEdit && item.entityId) onEdit(item.entityId);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200/50 dark:border-rose-900/50 rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>
            ) : item.type === 'TASK' && item.entityId && onNavigateToTask ? (
              <button
                onClick={() => onNavigateToTask(item.entityId!)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Briefcase size={14} />
                <span>Open Task</span>
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
