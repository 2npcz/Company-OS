import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, MapPin, Link2, Loader2, AlertCircle } from 'lucide-react';
import { CompanyEvent, CompanyEventType, Department } from '../../types';
import { calendarService } from '../../services/calendar.service';

interface Props {
  mode: 'create' | 'edit';
  event?: CompanyEvent | null;
  defaultDate?: string;
  departments: Department[];
  onClose: () => void;
  onSaved: () => void;
}

const EVENT_TYPES: { value: CompanyEventType; label: string; color: string }[] = [
  { value: 'EVENT', label: 'Company Event', color: '#4f46e5' },
  { value: 'MEETING', label: 'Meeting', color: '#0284c7' },
  { value: 'MILESTONE', label: 'Milestone', color: '#7c3aed' },
  { value: 'TRAINING', label: 'Training Session', color: '#059669' },
  { value: 'DEADLINE', label: 'Deadline', color: '#dc2626' },
  { value: 'HOLIDAY', label: 'Special Holiday', color: '#d97706' },
];

const PRESET_COLORS = [
  '#4f46e5', // indigo
  '#0284c7', // sky
  '#059669', // emerald
  '#d97706', // amber
  '#dc2626', // red
  '#7c3aed', // purple
  '#db2777', // pink
  '#475569', // slate
];

export const EventModal: React.FC<Props> = ({
  mode,
  event,
  defaultDate,
  departments,
  onClose,
  onSaved,
}) => {
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [eventType, setEventType] = useState<CompanyEventType>(event?.eventType || 'EVENT');
  const [isAllDay, setIsAllDay] = useState(event ? event.isAllDay : false);

  const initialStart = event?.startTime
    ? event.startTime.slice(0, 16)
    : defaultDate
    ? `${defaultDate}T09:00`
    : new Date().toISOString().slice(0, 16);

  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(event?.endTime ? event.endTime.slice(0, 16) : '');
  const [location, setLocation] = useState(event?.location || '');
  const [meetingLink, setMeetingLink] = useState(event?.meetingLink || '');
  const [departmentId, setDepartmentId] = useState(event?.departmentId || '');
  const [color, setColor] = useState(event?.color || '#4f46e5');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Event title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'create') {
        await calendarService.createEvent({
          title: title.trim(),
          description: description.trim() || undefined,
          eventType,
          startTime: new Date(startTime).toISOString(),
          endTime: endTime ? new Date(endTime).toISOString() : undefined,
          isAllDay,
          location: location.trim() || undefined,
          meetingLink: meetingLink.trim() || undefined,
          departmentId: departmentId || undefined,
          color,
        });
      } else if (event?.id) {
        await calendarService.updateEvent(event.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          eventType,
          startTime: new Date(startTime).toISOString(),
          endTime: endTime ? new Date(endTime).toISOString() : undefined,
          isAllDay,
          location: location.trim() || undefined,
          meetingLink: meetingLink.trim() || undefined,
          departmentId: departmentId || undefined,
          color,
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save event. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              <CalendarIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {mode === 'create' ? 'Schedule Company Event' : 'Edit Event'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">EcoGlobal Trading BD Calendar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/60 rounded-xl text-red-700 dark:text-rose-300 text-sm">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Q4 Export Planning Meeting"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-cyan-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Category
              </label>
              <select
                value={eventType}
                onChange={e => {
                  const val = e.target.value as CompanyEventType;
                  setEventType(val);
                  const matched = EVENT_TYPES.find(t => t.value === val);
                  if (matched) setColor(matched.color);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-cyan-500 focus:bg-white dark:focus:bg-slate-800"
              >
                {EVENT_TYPES.map(t => (
                  <option key={t.value} value={t.value} className="dark:bg-slate-900">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Department
              </label>
              <select
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-cyan-500 focus:bg-white dark:focus:bg-slate-800"
              >
                <option value="" className="dark:bg-slate-900">All Company (All Teams)</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id} className="dark:bg-slate-900">
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 pb-1">
            <input
              type="checkbox"
              id="isAllDay"
              checked={isAllDay}
              onChange={e => setIsAllDay(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="isAllDay" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              All Day Event / Milestone
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Start Time *
              </label>
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                required
                value={isAllDay ? startTime.split('T')[0] : startTime}
                onChange={e => {
                  const val = e.target.value;
                  setStartTime(isAllDay ? `${val}T09:00` : val);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-cyan-500 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                End Time (Optional)
              </label>
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={isAllDay && endTime ? endTime.split('T')[0] : endTime}
                onChange={e => {
                  const val = e.target.value;
                  setEndTime(val ? (isAllDay ? `${val}T18:00` : val) : '');
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-cyan-500 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Location
              </label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Conference Room A"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-cyan-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Meeting Link
              </label>
              <div className="relative">
                <Link2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={meetingLink}
                  onChange={e => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-cyan-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add agenda, notes, or attendee instructions..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-cyan-500 focus:bg-white dark:focus:bg-slate-800 resize-none"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
              Event Badge Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                    color === c ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500 dark:ring-cyan-400 shadow-sm' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              <span>{mode === 'create' ? 'Create Event' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
