import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Send,
  MessageSquare,
  Activity,
  User,
  Folder,
  Tag,
  Loader2,
  CheckSquare,
} from 'lucide-react';
import {
  Task,
  TaskStatus,
  TaskPriority,
  Project,
} from '../../types';
import { workService } from '../../services/work.service';

interface Props {
  taskId: string;
  projects: Project[];
  employees: { id: string; name: string; avatar?: string }[];
  currentUserId?: string;
  onClose: () => void;
  onTaskUpdated: () => void;
  onEditTask: (task: Task) => void;
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  BACKLOG: { label: 'Backlog', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  TODO: { label: 'To Do', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  REVIEW: { label: 'In Review', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  BLOCKED: { label: 'Blocked', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-100', text: 'text-slate-400', border: 'border-slate-200' },
};

const PRIORITY_BADGES: Record<
  TaskPriority,
  { label: string; color: string }
> = {
  LOW: { label: 'Low', color: 'bg-slate-100 text-slate-700' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  HIGH: { label: 'High', color: 'bg-amber-100 text-amber-800' },
  URGENT: { label: 'Urgent', color: 'bg-red-100 text-red-800 font-bold' },
};

export const TaskDetailModal: React.FC<Props> = ({
  taskId,
  onClose,
  onTaskUpdated,
  onEditTask,
}) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subtasks' | 'updates' | 'comments'>('subtasks');

  // Subtask form
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  // Comment form
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Work Update form
  const [showWorkUpdateForm, setShowWorkUpdateForm] = useState(false);
  const [updateSummary, setUpdateSummary] = useState('');
  const [updateHours, setUpdateHours] = useState('1');
  const [updateProgress, setUpdateProgress] = useState('');
  const [updateBlockers, setUpdateBlockers] = useState('');
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);

  // Blocker prompt
  const [showBlockerPrompt, setShowBlockerPrompt] = useState(false);
  const [blockerReasonInput, setBlockerReasonInput] = useState('');

  const loadTask = async () => {
    try {
      const data = await workService.getTaskById(taskId);
      setTask(data);
    } catch (e) {
      console.error('Failed to load task:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [taskId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 flex items-center gap-3 shadow-2xl">
          <Loader2 className="animate-spin text-indigo-600" size={24} />
          <span className="text-sm font-medium text-slate-700">Loading task details...</span>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
          <p className="text-slate-600 text-sm">Task not found or was deleted.</p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isOverdue =
    task.dueDate &&
    task.status !== 'COMPLETED' &&
    task.dueDate < new Date().toISOString().split('T')[0];

  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter(s => s.isCompleted).length;
  const subtaskProgress =
    subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : task.progress;

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (newStatus === 'BLOCKED') {
      setShowBlockerPrompt(true);
      return;
    }
    await workService.updateTaskStatus(task.id, newStatus);
    await loadTask();
    onTaskUpdated();
  };

  const submitBlockedStatus = async () => {
    if (!blockerReasonInput.trim()) return;
    await workService.updateTaskStatus(task.id, 'BLOCKED', blockerReasonInput.trim());
    setShowBlockerPrompt(false);
    setBlockerReasonInput('');
    await loadTask();
    onTaskUpdated();
  };

  const handleUnblock = async () => {
    await workService.updateTaskStatus(task.id, 'IN_PROGRESS');
    await loadTask();
    onTaskUpdated();
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    setIsAddingSubtask(true);
    try {
      await workService.createSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      await loadTask();
      onTaskUpdated();
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    await workService.toggleSubtask(subtaskId, isCompleted, task.id);
    await loadTask();
    onTaskUpdated();
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    await workService.deleteSubtask(subtaskId, task.id);
    await loadTask();
    onTaskUpdated();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsPostingComment(true);
    try {
      await workService.addComment(task.id, newComment.trim());
      setNewComment('');
      await loadTask();
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleAddWorkUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateSummary.trim()) return;
    setIsPostingUpdate(true);
    try {
      await workService.addWorkUpdate(task.id, {
        summary: updateSummary.trim(),
        hoursSpent: Number(updateHours) || 0,
        progressPercent: updateProgress ? Number(updateProgress) : undefined,
        blockers: updateBlockers.trim() || undefined,
      });
      setUpdateSummary('');
      setUpdateHours('1');
      setUpdateProgress('');
      setUpdateBlockers('');
      setShowWorkUpdateForm(false);
      await loadTask();
      onTaskUpdated();
    } finally {
      setIsPostingUpdate(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm(`Are you sure you want to delete task "${task.title}"?`)) return;
    await workService.deleteTask(task.id);
    onTaskUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {task.projectName && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                  <Folder size={12} />
                  {task.projectName}
                </span>
              )}
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  PRIORITY_BADGES[task.priority]?.color
                }`}
              >
                {PRIORITY_BADGES[task.priority]?.label} Priority
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  STATUS_CONFIG[task.status]?.bg
                } ${STATUS_CONFIG[task.status]?.text} ${STATUS_CONFIG[task.status]?.border}`}
              >
                {STATUS_CONFIG[task.status]?.label}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">{task.title}</h2>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => {
                onClose();
                onEditTask(task);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 bg-slate-100 dark:bg-slate-800/80 rounded-lg transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDeleteTask}
              title="Delete Task"
              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Overdue Alert */}
          {isOverdue && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertTriangle size={18} className="flex-shrink-0 text-red-600" />
              <span>
                <strong>Overdue Task:</strong> Target due date was{' '}
                {new Date(task.dueDate!).toLocaleDateString('en-GB')}. Immediate action needed.
              </span>
            </div>
          )}

          {/* Blocked Alert */}
          {task.status === 'BLOCKED' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-900">Task is Blocked</h4>
                  <p className="text-xs text-red-700 mt-0.5">
                    {task.blockedReason || 'No specific blocker details given.'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleUnblock}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex-shrink-0"
              >
                Unblock
              </button>
            </div>
          )}

          {/* Status Progression Bar */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Workflow Status
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'COMPLETED'] as TaskStatus[]
              ).map(st => {
                const isActive = task.status === st;
                return (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      isActive
                        ? `${STATUS_CONFIG[st].bg} ${STATUS_CONFIG[st].text} ${STATUS_CONFIG[st].border} ring-2 ring-indigo-500 font-bold shadow-sm`
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {STATUS_CONFIG[st].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Blocker Reason Prompt Modal/Inline */}
          {showBlockerPrompt && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-red-800 uppercase">
                Reason For Blocker *
              </label>
              <input
                type="text"
                value={blockerReasonInput}
                onChange={e => setBlockerReasonInput(e.target.value)}
                placeholder="What is blocking this work? (e.g. Awaiting client signature)"
                className="w-full px-3 py-2 bg-white border border-red-300 rounded-lg text-sm text-red-900 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setShowBlockerPrompt(false)}
                  className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={submitBlockedStatus}
                  className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded-lg"
                >
                  Mark as Blocked
                </button>
              </div>
            </div>
          )}

          {/* Key Metrics & Meta Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase block">
                Assignee
              </span>
              <div className="flex items-center gap-2 mt-1">
                {task.assigneeAvatar ? (
                  <img
                    src={task.assigneeAvatar}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                    {task.assigneeName ? task.assigneeName[0].toUpperCase() : <User size={12} />}
                  </div>
                )}
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {task.assigneeName || 'Unassigned'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase block">
                Due Date
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Calendar size={14} className={isOverdue ? 'text-red-600' : 'text-slate-400'} />
                <span>
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString('en-GB')
                    : 'No due date'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase block">
                Hours (Est / Act)
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-slate-800">
                <Clock size={14} className="text-slate-400" />
                <span>
                  {task.estimatedHours || 0}h / <strong>{task.actualHours || 0}h</strong>
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase block">
                Progress ({task.progress}%)
              </span>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2.5 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    task.progress === 100
                      ? 'bg-emerald-500'
                      : task.status === 'BLOCKED'
                      ? 'bg-red-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Description
              </span>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                {task.description}
              </p>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag size={13} className="text-slate-400" />
              {task.tags.map(t => (
                <span
                  key={t}
                  className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Tabs: Subtasks / Work Updates / Comments */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <button
                onClick={() => setActiveTab('subtasks')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === 'subtasks'
                    ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <CheckSquare size={14} />
                <span>Subtasks ({subtasks.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('updates')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === 'updates'
                    ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Activity size={14} />
                <span>Work Updates ({task.workUpdates?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('comments')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === 'comments'
                    ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquare size={14} />
                <span>Discussion ({task.comments?.length || 0})</span>
              </button>
            </div>

            {/* Subtasks Tab */}
            {activeTab === 'subtasks' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {completedSubtasks} of {subtasks.length} completed ({subtaskProgress}%)
                  </span>
                </div>

                <div className="space-y-2">
                  {subtasks.map(st => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-100 transition-colors group"
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={st.isCompleted}
                          onChange={e => handleToggleSubtask(st.id, e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span
                          className={`text-sm ${
                            st.isCompleted
                              ? 'line-through text-slate-400'
                              : 'text-slate-800 font-medium'
                          }`}
                        >
                          {st.title}
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteSubtask(st.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all cursor-pointer"
                        title="Delete Subtask"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {subtasks.length === 0 && (
                    <p className="text-xs text-slate-400 italic py-2">
                      No subtasks yet. Break this task down into smaller actionable steps.
                    </p>
                  )}
                </div>

                {/* Add Subtask Form */}
                <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a new subtask..."
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={isAddingSubtask || !newSubtaskTitle.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isAddingSubtask ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    <span>Add</span>
                  </button>
                </form>
              </div>
            )}

            {/* Work Updates Tab */}
            {activeTab === 'updates' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Daily work progress and hours logged for EcoGlobal Trading BD
                  </span>
                  <button
                    onClick={() => setShowWorkUpdateForm(!showWorkUpdateForm)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Plus size={14} />
                    <span>Log Work Update</span>
                  </button>
                </div>

                {showWorkUpdateForm && (
                  <form
                    onSubmit={handleAddWorkUpdate}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
                  >
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        What did you work on today? *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={updateSummary}
                        onChange={e => setUpdateSummary(e.target.value)}
                        placeholder="e.g. Prepared export manifests, coordinated shipment timeline..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Hours Spent
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={updateHours}
                          onChange={e => setUpdateHours(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          New Progress (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={updateProgress}
                          onChange={e => setUpdateProgress(e.target.value)}
                          placeholder={`${task.progress}%`}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Any Blockers? (Optional)
                      </label>
                      <input
                        type="text"
                        value={updateBlockers}
                        onChange={e => setUpdateBlockers(e.target.value)}
                        placeholder="e.g. Waiting on invoice approval from accounts"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowWorkUpdateForm(false)}
                        className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isPostingUpdate || !updateSummary.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                      >
                        {isPostingUpdate && <Loader2 size={12} className="animate-spin" />}
                        <span>Submit Update</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Logged Updates List */}
                <div className="space-y-3">
                  {(task.workUpdates || []).map(wu => (
                    <div
                      key={wu.id}
                      className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-sm space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-semibold text-slate-800">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          <span>{wu.employeeName || 'Team Member'}</span>
                        </div>
                        <span className="text-slate-400">
                          {new Date(wu.date).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{wu.summary}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                        {wu.hoursSpent ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} /> {wu.hoursSpent}h logged
                          </span>
                        ) : null}
                        {wu.progressPercent != null && (
                          <span>Progress: {wu.progressPercent}%</span>
                        )}
                        {wu.blockers && (
                          <span className="text-red-600 font-medium">
                            Blocker: {wu.blockers}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {(!task.workUpdates || task.workUpdates.length === 0) && (
                    <p className="text-xs text-slate-400 italic py-2">
                      No work updates logged yet. Keep your team aligned by posting daily updates.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {(task.comments || []).map(c => (
                    <div key={c.id} className="flex items-start gap-3 text-sm">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {c.authorName ? c.authorName[0].toUpperCase() : 'U'}
                      </div>
                      <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span className="font-semibold text-slate-800">{c.authorName || 'User'}</span>
                          <span>{c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{c.content}</p>
                      </div>
                    </div>
                  ))}

                  {(!task.comments || task.comments.length === 0) && (
                    <p className="text-xs text-slate-400 italic py-2">
                      No comments yet. Start the conversation with your team.
                    </p>
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Write a comment or note..."
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={isPostingComment || !newComment.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isPostingComment ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    <span>Send</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
