import React, { useState, useEffect } from 'react';
import {
  Kanban,
  ListTodo,
  FolderKanban,
  Users2,
  Plus,
  RefreshCw,
  Loader2,
  Briefcase,
  AlertTriangle,
} from 'lucide-react';
import {
  Task,
  Project,
  TaskStatus,
  TaskWorkloadSummary,
} from '../types';
import { workService } from '../services/work.service';
import { hrService } from '../services/hrService';
import { WorkKanbanBoard } from '../components/work/WorkKanbanBoard';
import { WorkListView } from '../components/work/WorkListView';
import { ProjectsView } from '../components/work/ProjectsView';
import { WorkloadView } from '../components/work/WorkloadView';
import { TaskModal } from '../components/work/TaskModal';
import { TaskDetailModal } from '../components/work/TaskDetailModal';
import { ProjectModal } from '../components/work/ProjectModal';
import { useSubscription } from '../context/SubscriptionContext';

interface Props {
  user: any;
  initialTab?: 'KANBAN' | 'LIST' | 'PROJECTS' | 'WORKLOAD';
  onNavigate?: (path: string) => void;
}

export const WorkManagement: React.FC<Props> = ({
  user,
  initialTab = 'KANBAN',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'KANBAN' | 'LIST' | 'PROJECTS' | 'WORKLOAD'>(initialTab);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; avatar?: string }[]>([]);
  const [workload, setWorkload] = useState<TaskWorkloadSummary[]>([]);

  // Modals state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalDefaultStatus, setTaskModalDefaultStatus] = useState<TaskStatus | undefined>(undefined);
  const [taskModalDefaultProjectId, setTaskModalDefaultProjectId] = useState<string | undefined>(undefined);

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const { canPerformAction, subscription } = useSubscription();
  const canWrite = canPerformAction('write');

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [fetchedTasks, fetchedProjects, fetchedEmployees, fetchedWorkload] =
        await Promise.all([
          workService.getTasks(),
          workService.getProjects(),
          hrService.getEmployees().catch(() => []),
          workService.getWorkloadMetrics(),
        ]);

      setTasks(fetchedTasks);
      setProjects(fetchedProjects);
      setEmployees(
        (fetchedEmployees || []).map((e: any) => ({
          id: e.id,
          name: e.name,
          avatar: e.avatar,
        }))
      );
      setWorkload(fetchedWorkload);
    } catch (err) {
      console.error('[WorkManagement] Error loading work data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers for task modals
  const handleOpenCreateTask = (status?: TaskStatus, projectId?: string) => {
    setEditingTask(null);
    setTaskModalDefaultStatus(status || 'TODO');
    setTaskModalDefaultProjectId(projectId);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleOpenCreateProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (project: Project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleViewProjectTasks = (projectId: string) => {
    setActiveTab('KANBAN');
  };

  const handleSelectEmployeeTasks = (employeeId: string) => {
    setActiveTab('KANBAN');
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
        <span className="text-sm font-medium">Loading EcoGlobal Trading BD Work Center...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Trial / Subscription Alert if expired */}
      {!canWrite && (
        <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>
            {subscription?.status === 'EXPIRED'
              ? 'Your subscription trial has expired. Tasks and projects are in read-only mode.'
              : 'Action disabled in your current subscription tier.'}
          </span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Briefcase size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">Work Management</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
                Phase 3
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              EcoGlobal Trading BD • Projects, Kanban, Tasks & Workflow Distribution
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Refresh work data"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
          </button>

          <button
            onClick={handleOpenCreateProject}
            disabled={!canWrite}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            <FolderKanban size={15} />
            <span>New Project</span>
          </button>

          <button
            onClick={() => handleOpenCreateTask()}
            disabled={!canWrite}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-100 transition-all disabled:opacity-50"
          >
            <Plus size={16} />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 bg-slate-100/70 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 max-w-xl">
        <button
          onClick={() => setActiveTab('KANBAN')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'KANBAN'
              ? 'bg-white text-indigo-700 dark:bg-slate-800 dark:text-cyan-400 dark:border dark:border-cyan-500/20 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Kanban size={15} />
          <span>Kanban Board</span>
        </button>

        <button
          onClick={() => setActiveTab('LIST')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'LIST'
              ? 'bg-white text-indigo-700 dark:bg-slate-800 dark:text-cyan-400 dark:border dark:border-cyan-500/20 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <ListTodo size={15} />
          <span>Task List</span>
        </button>

        <button
          onClick={() => setActiveTab('PROJECTS')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'PROJECTS'
              ? 'bg-white text-indigo-700 dark:bg-slate-800 dark:text-cyan-400 dark:border dark:border-cyan-500/20 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <FolderKanban size={15} />
          <span>Projects ({projects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('WORKLOAD')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'WORKLOAD'
              ? 'bg-white text-indigo-700 dark:bg-slate-800 dark:text-cyan-400 dark:border dark:border-cyan-500/20 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Users2 size={15} />
          <span>Team Workload</span>
        </button>
      </div>

      {/* Main View Tab Content */}
      {activeTab === 'KANBAN' && (
        <WorkKanbanBoard
          tasks={tasks}
          projects={projects}
          employees={employees}
          onTaskClick={task => setSelectedTaskId(task.id)}
          onAddTask={status => handleOpenCreateTask(status)}
          onTaskUpdated={() => loadData(true)}
        />
      )}

      {activeTab === 'LIST' && (
        <WorkListView
          tasks={tasks}
          projects={projects}
          employees={employees}
          onTaskClick={task => setSelectedTaskId(task.id)}
          onEditTask={handleOpenEditTask}
          onTaskUpdated={() => loadData(true)}
        />
      )}

      {activeTab === 'PROJECTS' && (
        <ProjectsView
          projects={projects}
          onAddProject={handleOpenCreateProject}
          onEditProject={handleOpenEditProject}
          onViewProjectTasks={handleViewProjectTasks}
          onProjectUpdated={() => loadData(true)}
        />
      )}

      {activeTab === 'WORKLOAD' && (
        <WorkloadView
          workload={workload}
          onSelectEmployeeTasks={handleSelectEmployeeTasks}
        />
      )}

      {/* Modals */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          projects={projects}
          employees={employees}
          currentUserId={user?.id}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={() => loadData(true)}
          onEditTask={handleOpenEditTask}
        />
      )}

      {isTaskModalOpen && (
        <TaskModal
          mode={editingTask ? 'edit' : 'create'}
          task={editingTask}
          projects={projects}
          employees={employees}
          defaultStatus={taskModalDefaultStatus}
          defaultProjectId={taskModalDefaultProjectId}
          onClose={() => {
            setIsTaskModalOpen(false);
            setEditingTask(null);
          }}
          onSaved={() => loadData(true)}
        />
      )}

      {isProjectModalOpen && (
        <ProjectModal
          mode={editingProject ? 'edit' : 'create'}
          project={editingProject}
          employees={employees}
          onClose={() => {
            setIsProjectModalOpen(false);
            setEditingProject(null);
          }}
          onSaved={() => loadData(true)}
        />
      )}
    </div>
  );
};

export default WorkManagement;
