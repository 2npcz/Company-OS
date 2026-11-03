import React, { useState } from 'react';
import { X, CheckSquare, Edit3, Loader2, AlertCircle } from 'lucide-react';
import { Task, TaskPriority, TaskStatus, Project } from '../../types';
import { workService } from '../../services/work.service';

interface Props {
  mode: 'create' | 'edit';
  task?: Task | null;
  projects: Project[];
  employees: { id: string; name: string; avatar?: string }[];
  defaultStatus?: TaskStatus;
  defaultProjectId?: string;
  onClose: () => void;
  onSaved: () => void;
}

const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

export const TaskModal: React.FC<Props> = ({
  mode,
  task,
  projects,
  employees,
  defaultStatus = 'TODO',
  defaultProjectId,
  onClose,
  onSaved,
}) => {
  const [title, setTitle] = useState(task?.title || '');
  const [projectId, setProjectId] = useState(task?.projectId || defaultProjectId || '');
  const [description, setDescription] = useState(task?.description || '');
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId || '');
  const [status, setStatus] = useState<TaskStatus>(task?.status || defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'MEDIUM');
  const [startDate, setStartDate] = useState(task?.startDate || '');
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [estimatedHours, setEstimatedHours] = useState(task?.estimatedHours ? String(task.estimatedHours) : '0');
  const [blockedReason, setBlockedReason] = useState(task?.blockedReason || '');
  const [tagsInput, setTagsInput] = useState((task?.tags || []).join(', '));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    if (status === 'BLOCKED' && !blockedReason.trim()) {
      setError('Please provide a blocker reason for blocked tasks');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    try {
      if (mode === 'create') {
        await workService.createTask({
          title: title.trim(),
          projectId: projectId || undefined,
          description: description.trim() || undefined,
          assigneeId: assigneeId || undefined,
          status,
          priority,
          startDate: startDate || undefined,
          dueDate: dueDate || undefined,
          estimatedHours: Number(estimatedHours) || 0,
          blockedReason: status === 'BLOCKED' ? blockedReason.trim() : undefined,
          tags,
        });
      } else if (task?.id) {
        await workService.updateTask(task.id, {
          title: title.trim(),
          projectId: projectId || undefined,
          description: description.trim() || undefined,
          assigneeId: assigneeId || undefined,
          status,
          priority,
          startDate: startDate || undefined,
          dueDate: dueDate || undefined,
          estimatedHours: Number(estimatedHours) || 0,
          blockedReason: status === 'BLOCKED' ? blockedReason.trim() : undefined,
          tags,
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              {mode === 'create' ? <CheckSquare size={20} /> : <Edit3 size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {mode === 'create' ? 'Create New Task' : 'Edit Task'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                EcoGlobal Trading BD Work Management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Verify export bill of lading and letter of credit"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Project
              </label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="">No Project (Standalone Task)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.code ? `(${p.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="">Unassigned</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detailed instructions, acceptance criteria, or links..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                {TASK_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                {TASK_PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {status === 'BLOCKED' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
              <label className="block text-xs font-bold text-red-800 uppercase">
                Blocker Reason *
              </label>
              <input
                type="text"
                required
                value={blockedReason}
                onChange={e => setBlockedReason(e.target.value)}
                placeholder="What is blocking this task? (e.g. Waiting on customs release)"
                className="w-full px-3 py-2 bg-white border border-red-300 rounded-lg text-sm text-red-900 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Est. Hours
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours}
                onChange={e => setEstimatedHours(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="e.g. Documentation, LC, High Priority"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 dark:shadow-indigo-950/50 transition-all disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              <span>{mode === 'create' ? 'Create Task' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
