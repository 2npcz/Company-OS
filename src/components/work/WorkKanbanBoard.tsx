import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  Calendar,
  CheckSquare,
  ArrowRight,
  User,
  Folder,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  Task,
  TaskStatus,
  TaskPriority,
  Project,
} from '../../types';
import { workService } from '../../services/work.service';

interface Props {
  tasks: Task[];
  projects: Project[];
  employees: { id: string; name: string; avatar?: string }[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status?: TaskStatus) => void;
  onTaskUpdated: () => void;
}

const COLUMNS: { status: TaskStatus; title: string; color: string; badgeBg: string }[] = [
  { status: 'BACKLOG', title: 'Backlog', color: 'border-slate-300 dark:border-slate-600', badgeBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { status: 'TODO', title: 'To Do', color: 'border-blue-400 dark:border-blue-500', badgeBg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { status: 'IN_PROGRESS', title: 'In Progress', color: 'border-amber-400 dark:border-amber-500', badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  { status: 'REVIEW', title: 'Review', color: 'border-purple-400 dark:border-purple-500', badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  { status: 'BLOCKED', title: 'Blocked', color: 'border-red-400 dark:border-red-500', badgeBg: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  { status: 'COMPLETED', title: 'Completed', color: 'border-emerald-400 dark:border-emerald-500', badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
];

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  BACKLOG: 'TODO',
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'REVIEW',
  REVIEW: 'COMPLETED',
  BLOCKED: 'IN_PROGRESS',
  COMPLETED: null,
  CANCELLED: null,
};

const PRIORITY_BADGES: Record<TaskPriority, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  HIGH: { label: 'High', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  URGENT: { label: 'Urgent', color: 'bg-red-100 text-red-800 font-bold dark:bg-red-900/40 dark:text-red-300' },
};

export const WorkKanbanBoard: React.FC<Props> = ({
  tasks,
  projects,
  employees,
  onTaskClick,
  onAddTask,
  onTaskUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  const today = new Date().toISOString().split('T')[0];

  // Filtering
  const filteredTasks = tasks.filter(task => {
    if (selectedProjectId && task.projectId !== selectedProjectId) return false;
    if (selectedAssigneeId && task.assigneeId !== selectedAssigneeId) return false;
    if (selectedPriority && task.priority !== selectedPriority) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(term);
      const matchProject = task.projectName?.toLowerCase().includes(term);
      const matchAssignee = task.assigneeName?.toLowerCase().includes(term);
      if (!matchTitle && !matchProject && !matchAssignee) return false;
    }
    return true;
  });

  // WIP metrics across current filters
  const wipCount = filteredTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'REVIEW').length;
  const blockedCount = filteredTasks.filter(t => t.status === 'BLOCKED').length;
  const overdueCount = filteredTasks.filter(t => t.status !== 'COMPLETED' && t.dueDate && t.dueDate < today).length;

  const handleQuickMove = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const next = NEXT_STATUS[task.status];
    if (next) {
      await workService.updateTaskStatus(task.id, next);
      onTaskUpdated();
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedProjectId('');
    setSelectedAssigneeId('');
    setSelectedPriority('');
  };

  const hasActiveFilters = !!(searchTerm || selectedProjectId || selectedAssigneeId || selectedPriority);

  return (
    <div className="space-y-6">
      {/* Top Controls & Metrics Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Active WIP Tasks</span>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{wipCount}</p>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700 shadow-xs">Flow Pacing</span>
          </div>

          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase">Blocked Impediments</span>
              <p className="text-xl font-bold text-amber-900 dark:text-amber-300">{blockedCount}</p>
            </div>
            <AlertCircle size={20} className="text-amber-600 dark:text-amber-400" />
          </div>

          <div className="p-3 bg-red-50/60 dark:bg-rose-950/20 rounded-xl border border-red-200/60 dark:border-rose-800/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-red-700 dark:text-rose-400 uppercase">Overdue Tasks</span>
              <p className="text-xl font-bold text-red-900 dark:text-rose-300">{overdueCount}</p>
            </div>
            <AlertTriangle size={20} className="text-red-600 dark:text-rose-400" />
          </div>

          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">Total Tracked</span>
              <p className="text-xl font-bold text-indigo-900 dark:text-indigo-300">{filteredTasks.length}</p>
            </div>
            <button
              onClick={() => onAddTask()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus size={14} />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search tasks, project codes, assignees..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Assignee Filter */}
          <select
            value={selectedAssigneeId}
            onChange={e => setSelectedAssigneeId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Assignees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={e => setSelectedPriority(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.status);
          const nextTarget = NEXT_STATUS[col.status];

          return (
            <div
              key={col.status}
              className={`bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl p-3 border-t-4 ${col.color} border-slate-200 dark:border-slate-800/80 flex flex-col min-h-[500px] shadow-sm backdrop-blur-sm`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    {col.title}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.badgeBg}`}
                  >
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => onAddTask(col.status)}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-colors"
                  title={`Add task to ${col.title}`}
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-0.5">
                {colTasks.map(task => {
                  const isTaskOverdue =
                    task.dueDate &&
                    task.status !== 'COMPLETED' &&
                    task.dueDate < today;

                  const subtasksCount = task.subtasks?.length || 0;
                  const completedSubtasks =
                    task.subtasks?.filter(s => s.isCompleted).length || 0;

                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="bg-white dark:bg-slate-800/90 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-400 hover:shadow-md dark:hover:shadow-black/50 transition-all cursor-pointer space-y-2.5 group relative"
                    >
                      {/* Tags & Priority */}
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        {task.projectName ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md truncate max-w-[130px]">
                            <Folder size={10} />
                            {task.projectName}
                          </span>
                        ) : (
                          <span />
                        )}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            PRIORITY_BADGES[task.priority]?.color
                          }`}
                        >
                          {PRIORITY_BADGES[task.priority]?.label}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-semibold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {task.title}
                      </h4>

                      {/* Blocked Reason snippet */}
                      {task.status === 'BLOCKED' && task.blockedReason && (
                        <div className="text-[11px] bg-red-50 text-red-700 p-1.5 rounded-lg border border-red-200 flex items-start gap-1">
                          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5 text-red-600" />
                          <span className="line-clamp-2">{task.blockedReason}</span>
                        </div>
                      )}

                      {/* Progress bar */}
                      {task.progress > 0 && (
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              task.progress === 100
                                ? 'bg-emerald-500'
                                : task.status === 'BLOCKED'
                                ? 'bg-red-500'
                                : 'bg-indigo-600'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      )}

                      {/* Footer: Assignee, Due Date, Subtasks, Move Button */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-500">
                        {/* Assignee Avatar */}
                        <div className="flex items-center gap-1.5">
                          {task.assigneeAvatar ? (
                            <img
                              src={task.assigneeAvatar}
                              alt=""
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                              {task.assigneeName ? (
                                task.assigneeName[0].toUpperCase()
                              ) : (
                                <User size={10} />
                              )}
                            </div>
                          )}
                          <span className="text-[11px] font-medium text-slate-700 truncate max-w-[70px]">
                            {task.assigneeName ? task.assigneeName.split(' ')[0] : 'Open'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Subtasks Count */}
                          {subtasksCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 font-medium">
                              <CheckSquare size={11} />
                              {completedSubtasks}/{subtasksCount}
                            </span>
                          )}

                          {/* Due Date */}
                          {task.dueDate && (
                            <span
                              className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
                                isTaskOverdue ? 'text-red-600 font-bold' : 'text-slate-400'
                              }`}
                            >
                              <Calendar size={11} />
                              {new Date(task.dueDate).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          )}

                          {/* Quick advance button */}
                          {nextTarget && (
                            <button
                              onClick={e => handleQuickMove(e, task)}
                              title={`Advance to ${nextTarget}`}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-opacity"
                            >
                              <ArrowRight size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="h-28 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
