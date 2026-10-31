import React, { useState } from 'react';
import {
  Plus,
  Search,
  Folder,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  MoreVertical,
  Edit3,
  Trash2,
  DollarSign,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { Project, ProjectStatus, ProjectPriority } from '../../types';
import { workService } from '../../services/work.service';

interface Props {
  projects: Project[];
  onAddProject: () => void;
  onEditProject: (project: Project) => void;
  onViewProjectTasks: (projectId: string) => void;
  onProjectUpdated: () => void;
}

const STATUS_BADGES: Record<
  ProjectStatus,
  { label: string; color: string }
> = {
  PLANNING: { label: 'Planning', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  ACTIVE: { label: 'Active', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ON_HOLD: { label: 'On Hold', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', color: 'bg-slate-100 text-slate-400 border-slate-200' },
};

const PRIORITY_BADGES: Record<
  ProjectPriority,
  { label: string; color: string }
> = {
  LOW: { label: 'Low', color: 'text-slate-600 bg-slate-100' },
  MEDIUM: { label: 'Medium', color: 'text-blue-700 bg-blue-50' },
  HIGH: { label: 'High', color: 'text-amber-800 bg-amber-50' },
  URGENT: { label: 'Urgent', color: 'text-red-700 bg-red-50 font-bold' },
};

export const ProjectsView: React.FC<Props> = ({
  projects,
  onAddProject,
  onEditProject,
  onViewProjectTasks,
  onProjectUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const today = new Date().toISOString().split('T')[0];

  const handleDelete = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Are you sure you want to delete project "${project.name}"? Tasks associated with it will remain intact.`
      )
    )
      return;
    await workService.deleteProject(project.id);
    onProjectUpdated();
  };

  const filtered = projects.filter(p => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(term);
      const matchCode = p.code?.toLowerCase().includes(term);
      const matchDesc = p.description?.toLowerCase().includes(term);
      if (!matchName && !matchCode && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search projects by name, code, description..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="PLANNING">Planning</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <button
          onClick={onAddProject}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-100 transition-all"
        >
          <Plus size={16} />
          <span>New Project</span>
        </button>
      </div>

      {/* Grid of Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(project => {
          const isOverdue =
            project.targetDate &&
            project.status !== 'COMPLETED' &&
            project.targetDate < today;

          return (
            <div
              key={project.id}
              onClick={() => onViewProjectTasks(project.id)}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Header: Code & Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {project.code && (
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase">
                        {project.code}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        PRIORITY_BADGES[project.priority]?.color
                      }`}
                    >
                      {PRIORITY_BADGES[project.priority]?.label}
                    </span>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                      STATUS_BADGES[project.status]?.color
                    }`}
                  >
                    {STATUS_BADGES[project.status]?.label}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {project.progress}% Complete
                    </span>
                    <span>
                      {project.completedTaskCount || 0}/{project.taskCount || 0} tasks
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        project.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 truncate">
                    <User size={13} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate">{project.ownerName || 'Unassigned'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 justify-end">
                    <Calendar
                      size={13}
                      className={isOverdue ? 'text-red-600' : 'text-slate-400'}
                    />
                    <span className={isOverdue ? 'text-red-600 font-bold' : ''}>
                      {project.targetDate
                        ? new Date(project.targetDate).toLocaleDateString('en-GB')
                        : 'No target'}
                    </span>
                  </div>

                  {project.budget ? (
                    <div className="flex items-center gap-1 text-slate-700 font-medium">
                      <span>৳</span>
                      <span>{project.budget.toLocaleString()} BDT</span>
                    </div>
                  ) : null}

                  {project.tags && project.tags.length > 0 && (
                    <div className="text-[11px] text-slate-400 col-span-2 truncate">
                      {project.tags.map(t => `#${t}`).join(' ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div
                className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => onViewProjectTasks(project.id)}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  View Tasks →
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditProject(project)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit Project"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={e => handleDelete(e, project)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
            <Folder size={36} className="mx-auto text-slate-300" />
            <h4 className="text-sm font-bold text-slate-700">No Projects Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first project to organize work streams, track deliverables, and manage
              team progress.
            </p>
            <button
              onClick={onAddProject}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-sm hover:bg-indigo-700"
            >
              <Plus size={14} />
              <span>Create Project</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
