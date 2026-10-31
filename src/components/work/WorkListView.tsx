import React, { useState } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Folder,
  AlertTriangle,
  ArrowUpDown,
  MoreVertical,
  CheckCircle2,
  Trash2,
  Edit3,
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
  onEditTask: (task: Task) => void;
  onTaskUpdated: () => void;
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

const PRIORITY_BADGES: Record<TaskPriority, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  HIGH: { label: 'High', color: 'bg-amber-100 text-amber-800' },
  URGENT: { label: 'Urgent', color: 'bg-red-100 text-red-800 font-bold' },
};

export const WorkListView: React.FC<Props> = ({
  tasks,
  projects,
  employees,
  onTaskClick,
  onEditTask,
  onTaskUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'progress' | 'title'>('due_date');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const today = new Date().toISOString().split('T')[0];

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, taskId: string) => {
    e.stopPropagation();
    const newStatus = e.target.value as TaskStatus;
    await workService.updateTaskStatus(taskId, newStatus);
    onTaskUpdated();
  };

  const handleDelete = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    await workService.deleteTask(task.id);
    onTaskUpdated();
  };

  // Filter
  let filtered = tasks.filter(task => {
    if (selectedStatus && task.status !== selectedStatus) return false;
    if (selectedPriority && task.priority !== selectedPriority) return false;
    if (selectedProjectId && task.projectId !== selectedProjectId) return false;
    if (selectedAssigneeId && task.assigneeId !== selectedAssigneeId) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(term);
      const matchProject = task.projectName?.toLowerCase().includes(term);
      const matchAssignee = task.assigneeName?.toLowerCase().includes(term);
      if (!matchTitle && !matchProject && !matchAssignee) return false;
    }
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'due_date') {
      const da = a.dueDate || '9999-99-99';
      const db = b.dueDate || '9999-99-99';
      comparison = da.localeCompare(db);
    } else if (sortBy === 'progress') {
      comparison = a.progress - b.progress;
    } else if (sortBy === 'title') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortBy === 'priority') {
      const priorityOrder: Record<TaskPriority, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return sortAsc ? comparison : -comparison;
  });

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(col);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="BACKLOG">Backlog</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="REVIEW">Review</option>
          <option value="BLOCKED">Blocked</option>
          <option value="COMPLETED">Completed</option>
        </select>

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

        <select
          value={selectedAssigneeId}
          onChange={e => setSelectedAssigneeId(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Assignees</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th
                  onClick={() => toggleSort('title')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1">
                    <span>Task & Project</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('priority')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1">
                    <span>Priority</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-3.5 px-4">Assignee</th>
                <th className="py-3.5 px-4">Status</th>
                <th
                  onClick={() => toggleSort('due_date')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1">
                    <span>Due Date</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('progress')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1">
                    <span>Progress</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.map(task => {
                const isOverdue =
                  task.dueDate &&
                  task.status !== 'COMPLETED' &&
                  task.dueDate < today;

                return (
                  <tr
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Task Title & Project */}
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="space-y-1">
                        <span className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors block">
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          {task.projectName && (
                            <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded font-medium">
                              <Folder size={11} />
                              {task.projectName}
                            </span>
                          )}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <span>
                              {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length} subtasks
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          PRIORITY_BADGES[task.priority]?.color
                        }`}
                      >
                        {PRIORITY_BADGES[task.priority]?.label}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {task.assigneeAvatar ? (
                          <img
                            src={task.assigneeAvatar}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                            {task.assigneeName ? task.assigneeName[0].toUpperCase() : <User size={12} />}
                          </div>
                        )}
                        <span className="text-xs font-medium text-slate-700">
                          {task.assigneeName || 'Unassigned'}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <select
                        value={task.status}
                        onChange={e => handleStatusChange(e, task.id)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer ${
                          STATUS_CONFIG[task.status]?.bg
                        } ${STATUS_CONFIG[task.status]?.text} ${STATUS_CONFIG[task.status]?.border}`}
                      >
                        <option value="BACKLOG">Backlog</option>
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="REVIEW">Review</option>
                        <option value="BLOCKED">Blocked</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar size={13} className={isOverdue ? 'text-red-600' : 'text-slate-400'} />
                        <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-600'}>
                          {task.dueDate
                            ? new Date(task.dueDate).toLocaleDateString('en-GB')
                            : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Progress */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="w-24 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span>{task.progress}%</span>
                          {task.actualHours ? <span>{task.actualHours}h</span> : null}
                        </div>
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
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditTask(task)}
                          title="Edit Task"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={e => handleDelete(e, task)}
                          title="Delete Task"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                    No tasks match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
