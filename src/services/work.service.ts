import { supabase, isSupabaseConfigured } from './supabase';
import { resolveOrgId } from './api.client';
import {
  Project,
  ProjectMember,
  ProjectMemberRole,
  ProjectStatus,
  ProjectPriority,
  Task,
  TaskSubtask,
  TaskComment,
  TaskWorkUpdate,
  TaskStatus,
  TaskPriority,
  TaskWorkloadSummary,
} from '../types';

async function getCurrentUserId(): Promise<string | undefined> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export const workService = {
  // ==========================================
  // PROJECTS
  // ==========================================

  async getProjects(filters?: { status?: ProjectStatus; search?: string }): Promise<Project[]> {
    if (!isSupabaseConfigured()) return [];
    const orgId = await resolveOrgId();
    if (!orgId) return [];

    try {
      let query = supabase
        .from('projects')
        .select(`
          *,
          owner:profiles!owner_id(id, name, avatar),
          members:project_members(id),
          tasks:tasks(id, status)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[WorkService] getProjects error:', error.message);
        return [];
      }

      let projects: Project[] = (data || []).map((row: any) => {
        const tasks = row.tasks || [];
        const taskCount = tasks.length;
        const completedTaskCount = tasks.filter((t: any) => t.status === 'COMPLETED').length;
        const computedProgress = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : (row.progress || 0);

        return {
          id: row.id,
          organizationId: row.organization_id,
          name: row.name,
          code: row.code || undefined,
          description: row.description || undefined,
          ownerId: row.owner_id || undefined,
          ownerName: row.owner?.name || undefined,
          status: row.status as ProjectStatus,
          priority: row.priority as ProjectPriority,
          startDate: row.start_date || undefined,
          targetDate: row.target_date || undefined,
          completedDate: row.completed_date || undefined,
          budget: Number(row.budget || 0),
          progress: computedProgress,
          tags: row.tags || [],
          memberCount: (row.members || []).length,
          taskCount,
          completedTaskCount,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });

      if (filters?.search?.trim()) {
        const term = filters.search.trim().toLowerCase();
        projects = projects.filter(
          p => p.name.toLowerCase().includes(term) || (p.code && p.code.toLowerCase().includes(term)) || (p.description && p.description.toLowerCase().includes(term))
        );
      }

      return projects;
    } catch (err: any) {
      console.warn('[WorkService] getProjects exception:', err?.message || err);
      return [];
    }
  },

  async getProjectById(id: string): Promise<Project | null> {
    if (!isSupabaseConfigured()) return null;
    const orgId = await resolveOrgId();
    if (!orgId) return null;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          owner:profiles!owner_id(id, name, avatar),
          members:project_members(id),
          tasks:tasks(id, status)
        `)
        .eq('id', id)
        .eq('organization_id', orgId)
        .single();

      if (error || !data) return null;

      const tasks = data.tasks || [];
      const taskCount = tasks.length;
      const completedTaskCount = tasks.filter((t: any) => t.status === 'COMPLETED').length;
      const computedProgress = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : (data.progress || 0);

      return {
        id: data.id,
        organizationId: data.organization_id,
        name: data.name,
        code: data.code || undefined,
        description: data.description || undefined,
        ownerId: data.owner_id || undefined,
        ownerName: data.owner?.name || undefined,
        status: data.status as ProjectStatus,
        priority: data.priority as ProjectPriority,
        startDate: data.start_date || undefined,
        targetDate: data.target_date || undefined,
        completedDate: data.completed_date || undefined,
        budget: Number(data.budget || 0),
        progress: computedProgress,
        tags: data.tags || [],
        memberCount: (data.members || []).length,
        taskCount,
        completedTaskCount,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      return null;
    }
  },

  async createProject(project: Partial<Project>): Promise<Project | null> {
    if (!isSupabaseConfigured()) return null;
    const orgId = await resolveOrgId();
    if (!orgId) throw new Error('No organization context');
    const currentUserId = await getCurrentUserId();

    const insertPayload: any = {
      organization_id: orgId,
      name: project.name?.trim() || 'Untitled Project',
      code: project.code?.trim() || null,
      description: project.description?.trim() || null,
      owner_id: project.ownerId || currentUserId || null,
      status: project.status || 'ACTIVE',
      priority: project.priority || 'MEDIUM',
      start_date: project.startDate || null,
      target_date: project.targetDate || null,
      budget: project.budget ?? 0,
      progress: project.progress ?? 0,
      tags: project.tags || [],
    };

    const { data, error } = await supabase
      .from('projects')
      .insert([insertPayload])
      .select('*, owner:profiles!owner_id(id, name, avatar)')
      .single();

    if (error) {
      console.error('[WorkService] createProject error:', error.message);
      throw error;
    }

    // Auto-add owner/creator as Lead member
    const memberId = project.ownerId || currentUserId;
    if (memberId && data?.id) {
      await supabase.from('project_members').insert([
        {
          organization_id: orgId,
          project_id: data.id,
          employee_id: memberId,
          role: 'LEAD',
        },
      ]);
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      code: data.code || undefined,
      description: data.description || undefined,
      ownerId: data.owner_id || undefined,
      ownerName: data.owner?.name || undefined,
      status: data.status as ProjectStatus,
      priority: data.priority as ProjectPriority,
      startDate: data.start_date || undefined,
      targetDate: data.target_date || undefined,
      completedDate: data.completed_date || undefined,
      budget: Number(data.budget || 0),
      progress: data.progress || 0,
      tags: data.tags || [],
      memberCount: 1,
      taskCount: 0,
      completedTaskCount: 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const orgId = await resolveOrgId();
    if (!orgId) return false;

    const payload: any = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.code !== undefined) payload.code = updates.code ? updates.code.trim() : null;
    if (updates.description !== undefined) payload.description = updates.description ? updates.description.trim() : null;
    if (updates.ownerId !== undefined) payload.owner_id = updates.ownerId || null;
    if (updates.status !== undefined) {
      payload.status = updates.status;
      if (updates.status === 'COMPLETED' && !updates.completedDate) {
        payload.completed_date = new Date().toISOString().split('T')[0];
        payload.progress = 100;
      }
    }
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.startDate !== undefined) payload.start_date = updates.startDate || null;
    if (updates.targetDate !== undefined) payload.target_date = updates.targetDate || null;
    if (updates.completedDate !== undefined) payload.completed_date = updates.completedDate || null;
    if (updates.budget !== undefined) payload.budget = updates.budget;
    if (updates.progress !== undefined) payload.progress = updates.progress;
    if (updates.tags !== undefined) payload.tags = updates.tags;

    const { error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('[WorkService] updateProject error:', error.message);
      return false;
    }
    return true;
  },

  async deleteProject(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const orgId = await resolveOrgId();
    if (!orgId) return false;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('[WorkService] deleteProject error:', error.message);
      return false;
    }
    return true;
  },

  // ==========================================
  // PROJECT MEMBERS
  // ==========================================

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    if (!isSupabaseConfigured()) return [];
    const orgId = await resolveOrgId();
    if (!orgId) return [];

    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          *,
          employee:profiles!employee_id(id, name, avatar)
        `)
        .eq('project_id', projectId)
        .eq('organization_id', orgId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.warn('[WorkService] getProjectMembers error:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        organizationId: row.organization_id,
        projectId: row.project_id,
        employeeId: row.employee_id,
        employeeName: row.employee?.name || undefined,
        employeeAvatar: row.employee?.avatar || undefined,
        role: row.role as ProjectMemberRole,
        joinedAt: row.joined_at,
      }));
    } catch {
      return [];
    }
  },

  async addProjectMember(projectId: string, employeeId: string, role: ProjectMemberRole = 'MEMBER'): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const orgId = await resolveOrgId();
    if (!orgId) return false;

    const { error } = await supabase
      .from('project_members')
      .upsert(
        [
          {
            organization_id: orgId,
            project_id: projectId,
            employee_id: employeeId,
            role,
          },
        ],
        { onConflict: 'project_id, employee_id' }
      );

    if (error) {
      console.error('[WorkService] addProjectMember error:', error.message);
      return false;
    }
    return true;
  },

  async removeProjectMember(projectId: string, employeeId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const orgId = await resolveOrgId();
    if (!orgId) return false;

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('employee_id', employeeId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('[WorkService] removeProjectMember error:', error.message);
      return false;
    }
    return true;
  },

  // ==========================================
  // TASKS
  // ==========================================

  async getTasks(filters?: {
    projectId?: string;
    assigneeId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    search?: string;
  }): Promise<Task[]> {
    if (!isSupabaseConfigured()) return [];
    const orgId = await resolveOrgId();
    if (!orgId) return [];

    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          project:projects!project_id(id, name),
          assignee:profiles!assignee_id(id, name, avatar),
          creator:profiles!creator_id(id, name),
          subtasks:task_subtasks(id, title, is_completed, display_order)
        `)
        .eq('organization_id', orgId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters?.assigneeId) {
        query = query.eq('assignee_id', filters.assigneeId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[WorkService] getTasks error:', error.message);
        return [];
      }

      let tasks: Task[] = (data || []).map((row: any) => {
        const subtasks: TaskSubtask[] = (row.subtasks || []).map((st: any) => ({
          id: st.id,
          organizationId: row.organization_id,
          taskId: row.id,
          title: st.title,
          isCompleted: !!st.is_completed,
          displayOrder: st.display_order || 0,
        }));

        return {
          id: row.id,
          organizationId: row.organization_id,
          projectId: row.project_id || undefined,
          projectName: row.project?.name || undefined,
          departmentId: row.department_id || undefined,
          teamId: row.team_id || undefined,
          title: row.title,
          description: row.description || undefined,
          assigneeId: row.assignee_id || undefined,
          assigneeName: row.assignee?.name || undefined,
          assigneeAvatar: row.assignee?.avatar || undefined,
          creatorId: row.creator_id || undefined,
          creatorName: row.creator?.name || undefined,
          priority: row.priority as TaskPriority,
          status: row.status as TaskStatus,
          startDate: row.start_date || undefined,
          dueDate: row.due_date || undefined,
          estimatedHours: Number(row.estimated_hours || 0),
          actualHours: Number(row.actual_hours || 0),
          progress: Number(row.progress || 0),
          tags: row.tags || [],
          blockedReason: row.blocked_reason || undefined,
          displayOrder: row.display_order || 0,
          subtasks,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });

      if (filters?.search?.trim()) {
        const term = filters.search.trim().toLowerCase();
        tasks = tasks.filter(
          t =>
            t.title.toLowerCase().includes(term) ||
            (t.description && t.description.toLowerCase().includes(term)) ||
            (t.projectName && t.projectName.toLowerCase().includes(term)) ||
            (t.assigneeName && t.assigneeName.toLowerCase().includes(term))
        );
      }

      return tasks;
    } catch (err: any) {
      console.warn('[WorkService] getTasks exception:', err?.message || err);
      return [];
    }
  },

  async getTaskById(id: string): Promise<Task | null> {
    if (!isSupabaseConfigured()) return null;
    const orgId = await resolveOrgId();
    if (!orgId) return null;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects!project_id(id, name),
          assignee:profiles!assignee_id(id, name, avatar),
          creator:profiles!creator_id(id, name),
          subtasks:task_subtasks(*),
          comments:task_comments(*, author:profiles!author_id(id, name, avatar)),
          work_updates:task_work_updates(*, employee:profiles!employee_id(id, name, avatar))
        `)
        .eq('id', id)
        .eq('organization_id', orgId)
        .single();

      if (error || !data) return null;

      const subtasks: TaskSubtask[] = (data.subtasks || [])
        .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((st: any) => ({
          id: st.id,
          organizationId: data.organization_id,
          taskId: data.id,
          title: st.title,
          isCompleted: !!st.is_completed,
          assigneeId: st.assignee_id || undefined,
          dueDate: st.due_date || undefined,
          displayOrder: st.display_order || 0,
          createdAt: st.created_at,
          updatedAt: st.updated_at,
        }));

      const comments: TaskComment[] = (data.comments || [])
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((c: any) => ({
          id: c.id,
          organizationId: data.organization_id,
          taskId: data.id,
          authorId: c.author_id,
          authorName: c.author?.name || undefined,
          authorAvatar: c.author?.avatar || undefined,
          content: c.content,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        }));

      const workUpdates: TaskWorkUpdate[] = (data.work_updates || [])
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((wu: any) => ({
          id: wu.id,
          organizationId: data.organization_id,
          taskId: data.id,
          employeeId: wu.employee_id,
          employeeName: wu.employee?.name || undefined,
          summary: wu.summary,
          hoursSpent: Number(wu.hours_spent || 0),
          progressPercent: wu.progress_percent != null ? Number(wu.progress_percent) : undefined,
          blockers: wu.blockers || undefined,
          date: wu.date,
          createdAt: wu.created_at,
        }));

      return {
        id: data.id,
        organizationId: data.organization_id,
        projectId: data.project_id || undefined,
        projectName: data.project?.name || undefined,
        departmentId: data.department_id || undefined,
        teamId: data.team_id || undefined,
        title: data.title,
        description: data.description || undefined,
        assigneeId: data.assignee_id || undefined,
        assigneeName: data.assignee?.name || undefined,
        assigneeAvatar: data.assignee?.avatar || undefined,
        creatorId: data.creator_id || undefined,
        creatorName: data.creator?.name || undefined,
        priority: data.priority as TaskPriority,
        status: data.status as TaskStatus,
        startDate: data.start_date || undefined,
        dueDate: data.due_date || undefined,
        estimatedHours: Number(data.estimated_hours || 0),
        actualHours: Number(data.actual_hours || 0),
        progress: Number(data.progress || 0),
        tags: data.tags || [],
        blockedReason: data.blocked_reason || undefined,
        displayOrder: data.display_order || 0,
        subtasks,
        comments,
        workUpdates,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  },

  async createTask(task: Partial<Task>): Promise<Task | null> {
    if (!isSupabaseConfigured()) return null;
    const orgId = await resolveOrgId();
    if (!orgId) throw new Error('No organization context');
    const currentUserId = await getCurrentUserId();

    const insertPayload: any = {
      organization_id: orgId,
      project_id: task.projectId || null,
      department_id: task.departmentId || null,
      team_id: task.teamId || null,
      title: task.title?.trim() || 'Untitled Task',
      description: task.description?.trim() || null,
      assignee_id: task.assigneeId || null,
      creator_id: task.creatorId || currentUserId || null,
      priority: task.priority || 'MEDIUM',
      status: task.status || 'TODO',
      start_date: task.startDate || null,
      due_date: task.dueDate || null,
      estimated_hours: task.estimatedHours ?? 0,
      actual_hours: task.actualHours ?? 0,
      progress: task.progress ?? (task.status === 'COMPLETED' ? 100 : 0),
      tags: task.tags || [],
      blocked_reason: task.status === 'BLOCKED' ? (task.blockedReason || null) : null,
      display_order: task.displayOrder || 0,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([insertPayload])
      .select(`
        *,
        project:projects!project_id(id, name),
        assignee:profiles!assignee_id(id, name, avatar),
        creator:profiles!creator_id(id, name)
      `)
      .single();

    if (error) {
      console.error('[WorkService] createTask error:', error.message);
      throw error;
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      projectId: data.project_id || undefined,
      projectName: data.project?.name || undefined,
      departmentId: data.department_id || undefined,
      teamId: data.team_id || undefined,
      title: data.title,
      description: data.description || undefined,
      assigneeId: data.assignee_id || undefined,
      assigneeName: data.assignee?.name || undefined,
      assigneeAvatar: data.assignee?.avatar || undefined,
      creatorId: data.creator_id || undefined,
      creatorName: data.creator?.name || undefined,
      priority: data.priority as TaskPriority,
      status: data.status as TaskStatus,
      startDate: data.start_date || undefined,
      dueDate: data.due_date || undefined,
      estimatedHours: Number(data.estimated_hours || 0),
      actualHours: Number(data.actual_hours || 0),
      progress: Number(data.progress || 0),
      tags: data.tags || [],
      blockedReason: data.blocked_reason || undefined,
      displayOrder: data.display_order || 0,
      subtasks: [],
      comments: [],
      workUpdates: [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const orgId = await resolveOrgId();
    if (!orgId) return false;

    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.projectId !== undefined) payload.project_id = updates.projectId || null;
    if (updates.departmentId !== undefined) payload.department_id = updates.departmentId || null;
    if (updates.teamId !== undefined) payload.team_id = updates.teamId || null;
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description ? updates.description.trim() : null;
    if (updates.assigneeId !== undefined) payload.assignee_id = updates.assigneeId || null;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.status !== undefined) {
      payload.status = updates.status;
      if (updates.status === 'COMPLETED' && updates.progress === undefined) {
        payload.progress = 100;
      }
      if (updates.status !== 'BLOCKED') {
        payload.blocked_reason = null;
      }
    }
    if (updates.startDate !== undefined) payload.start_date = updates.startDate || null;
    if (updates.dueDate !== undefined) payload.due_date = updates.dueDate || null;
    if (updates.estimatedHours !== undefined) payload.estimated_hours = updates.estimatedHours;
    if (updates.actualHours !== undefined) payload.actual_hours = updates.actualHours;
    if (updates.progress !== undefined) payload.progress = updates.progress;
    if (updates.tags !== undefined) payload.tags = updates.tags;
    if (updates.blockedReason !== undefined) payload.blocked_reason = updates.blockedReason ? updates.blockedReason.trim() : null;
    if (updates.displayOrder !== undefined) payload.display_order = updates.displayOrder;

    const { error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('[WorkService] updateTask error:', error.message);
      return false;
    }
    return true;
  },

  async updateTaskStatus(id: string, status: TaskStatus, blockedReason?: string): Promise<boolean> {
    const updates: Partial<Task> = { status };
    if (status === 'BLOCKED') {
      updates.blockedReason = blockedReason || 'Blocked';
    } else {
      updates.blockedReason = '';
      if (status === 'COMPLETED') {
        updates.progress = 100;
      }
    }
    return this.updateTask(id, updates);
  },

  async deleteTask(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const orgId = await resolveOrgId();
    if (!orgId) return false;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('[WorkService] deleteTask error:', error.message);
      return false;
    }
    return true;
  },

  // ==========================================
  // SUBTASKS
  // ==========================================

  async createSubtask(taskId: string, title: string, assigneeId?: string, dueDate?: string): Promise<TaskSubtask | null> {
    if (!isSupabaseConfigured()) return null;
    const orgId = await resolveOrgId();
    if (!orgId) return null;

    const { data, error } = await supabase
      .from('task_subtasks')
      .insert([
        {
          organization_id: orgId,
          task_id: taskId,
          title: title.trim(),
          assignee_id: assigneeId || null,
          due_date: dueDate || null,
          is_completed: false,
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('[WorkService] createSubtask error:', error.message);
      return null;
    }

    await this.syncTaskProgressFromSubtasks(taskId);

    return {
      id: data.id,
      organizationId: data.organization_id,
      taskId: data.task_id,
      title: data.title,
      isCompleted: data.is_completed,
      assigneeId: data.assignee_id || undefined,
      dueDate: data.due_date || undefined,
      displayOrder: data.display_order || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async toggleSubtask(id: string, isCompleted: boolean, taskId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const orgId = await resolveOrgId();
    if (!orgId) return false;

    const { error } = await supabase
      .from('task_subtasks')
      .update({
        is_completed: isCompleted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('[WorkService] toggleSubtask error:', error.message);
      return false;
    }

    await this.syncTaskProgressFromSubtasks(taskId);
    return true;
  },

  async deleteSubtask(id: string, taskId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const orgId = await resolveOrgId();
    if (!orgId) return false;

    const { error } = await supabase
      .from('task_subtasks')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('[WorkService] deleteSubtask error:', error.message);
      return false;
    }

    await this.syncTaskProgressFromSubtasks(taskId);
    return true;
  },

  async syncTaskProgressFromSubtasks(taskId: string): Promise<void> {
    try {
      const { data: subtasks } = await supabase
        .from('task_subtasks')
        .select('is_completed')
        .eq('task_id', taskId);

      if (!subtasks || subtasks.length === 0) return;

      const total = subtasks.length;
      const completed = subtasks.filter((s: any) => s.is_completed).length;
      const progress = Math.round((completed / total) * 100);

      const updates: any = { progress, updated_at: new Date().toISOString() };
      if (completed === total) {
        updates.status = 'COMPLETED';
      }

      await supabase.from('tasks').update(updates).eq('id', taskId);
    } catch (err) {
      console.warn('[WorkService] syncTaskProgressFromSubtasks error:', err);
    }
  },

  // ==========================================
  // COMMENTS
  // ==========================================

  async addComment(taskId: string, content: string): Promise<TaskComment | null> {
    if (!isSupabaseConfigured()) return null;
    const orgId = await resolveOrgId();
    const currentUserId = await getCurrentUserId();
    if (!orgId || !currentUserId) return null;

    const { data, error } = await supabase
      .from('task_comments')
      .insert([
        {
          organization_id: orgId,
          task_id: taskId,
          author_id: currentUserId,
          content: content.trim(),
        },
      ])
      .select('*, author:profiles!author_id(id, name, avatar)')
      .single();

    if (error) {
      console.error('[WorkService] addComment error:', error.message);
      return null;
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      taskId: data.task_id,
      authorId: data.author_id,
      authorName: data.author?.name || undefined,
      authorAvatar: data.author?.avatar || undefined,
      content: data.content,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  // ==========================================
  // WORK UPDATES
  // ==========================================

  async addWorkUpdate(
    taskId: string,
    data: {
      summary: string;
      hoursSpent?: number;
      progressPercent?: number;
      blockers?: string;
      date?: string;
    }
  ): Promise<TaskWorkUpdate | null> {
    if (!isSupabaseConfigured()) return null;
    const orgId = await resolveOrgId();
    const currentUserId = await getCurrentUserId();
    if (!orgId || !currentUserId) return null;

    const { data: record, error } = await supabase
      .from('task_work_updates')
      .insert([
        {
          organization_id: orgId,
          task_id: taskId,
          employee_id: currentUserId,
          summary: data.summary.trim(),
          hours_spent: data.hoursSpent ?? 0,
          progress_percent: data.progressPercent ?? null,
          blockers: data.blockers?.trim() || null,
          date: data.date || new Date().toISOString().split('T')[0],
        },
      ])
      .select('*, employee:profiles!employee_id(id, name, avatar)')
      .single();

    if (error) {
      console.error('[WorkService] addWorkUpdate error:', error.message);
      return null;
    }

    // Reflect on task actual_hours and progress
    try {
      const { data: taskRow } = await supabase
        .from('tasks')
        .select('actual_hours, progress')
        .eq('id', taskId)
        .single();

      if (taskRow) {
        const newActual = Number(taskRow.actual_hours || 0) + Number(data.hoursSpent || 0);
        const taskUpdates: any = {
          actual_hours: newActual,
          updated_at: new Date().toISOString(),
        };
        if (data.progressPercent != null) {
          taskUpdates.progress = data.progressPercent;
          if (data.progressPercent === 100) {
            taskUpdates.status = 'COMPLETED';
          }
        }
        if (data.blockers?.trim()) {
          taskUpdates.status = 'BLOCKED';
          taskUpdates.blocked_reason = data.blockers.trim();
        }
        await supabase.from('tasks').update(taskUpdates).eq('id', taskId);
      }
    } catch (err) {
      console.warn('[WorkService] Error updating task from work update:', err);
    }

    return {
      id: record.id,
      organizationId: record.organization_id,
      taskId: record.task_id,
      employeeId: record.employee_id,
      employeeName: record.employee?.name || undefined,
      summary: record.summary,
      hoursSpent: Number(record.hours_spent || 0),
      progressPercent: record.progress_percent != null ? Number(record.progress_percent) : undefined,
      blockers: record.blockers || undefined,
      date: record.date,
      createdAt: record.created_at,
    };
  },

  // ==========================================
  // WORKLOAD & AGGREGATE METRICS
  // ==========================================

  async getWorkloadMetrics(): Promise<TaskWorkloadSummary[]> {
    if (!isSupabaseConfigured()) return [];
    const orgId = await resolveOrgId();
    if (!orgId) return [];

    try {
      // Fetch employees in org
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, name, avatar, department')
        .eq('organization_id', orgId)
        .eq('status', 'ACTIVE')
        .order('name');

      if (profErr || !profiles) return [];

      // Fetch open/active tasks
      const { data: tasks, error: taskErr } = await supabase
        .from('tasks')
        .select('assignee_id, status, due_date, estimated_hours, actual_hours')
        .eq('organization_id', orgId)
        .neq('status', 'CANCELLED');

      if (taskErr || !tasks) return [];

      const today = new Date().toISOString().split('T')[0];

      return profiles.map((p: any) => {
        const empTasks = tasks.filter((t: any) => t.assignee_id === p.id);
        const totalTasks = empTasks.length;
        const wipTasks = empTasks.filter((t: any) => t.status === 'IN_PROGRESS' || t.status === 'REVIEW').length;
        const overdueTasks = empTasks.filter(
          (t: any) => t.status !== 'COMPLETED' && t.due_date && t.due_date < today
        ).length;
        const blockedTasks = empTasks.filter((t: any) => t.status === 'BLOCKED').length;
        const completedTasks = empTasks.filter((t: any) => t.status === 'COMPLETED').length;
        const estimatedHoursTotal = empTasks.reduce((sum: number, t: any) => sum + Number(t.estimated_hours || 0), 0);
        const actualHoursTotal = empTasks.reduce((sum: number, t: any) => sum + Number(t.actual_hours || 0), 0);

        return {
          employeeId: p.id,
          employeeName: p.name || 'Unknown',
          employeeAvatar: p.avatar || undefined,
          department: p.department || undefined,
          totalTasks,
          wipTasks,
          overdueTasks,
          blockedTasks,
          completedTasks,
          estimatedHoursTotal,
          actualHoursTotal,
        };
      });
    } catch (err: any) {
      console.warn('[WorkService] getWorkloadMetrics error:', err?.message || err);
      return [];
    }
  },
};
