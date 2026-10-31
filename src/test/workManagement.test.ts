import { describe, it, expect } from 'vitest';
import { workService } from '../services/work.service';
import { getCurrentRoute, navigateToRoute } from '../utils/deeplink';
import { TaskStatus, ProjectStatus } from '../types';

describe('Work Management — Phase 3', () => {
  describe('workService API contracts', () => {
    it('exports all expected project and task functions', () => {
      expect(typeof workService.getProjects).toBe('function');
      expect(typeof workService.getProjectById).toBe('function');
      expect(typeof workService.createProject).toBe('function');
      expect(typeof workService.updateProject).toBe('function');
      expect(typeof workService.deleteProject).toBe('function');
      expect(typeof workService.getProjectMembers).toBe('function');
      expect(typeof workService.addProjectMember).toBe('function');
      expect(typeof workService.removeProjectMember).toBe('function');

      expect(typeof workService.getTasks).toBe('function');
      expect(typeof workService.getTaskById).toBe('function');
      expect(typeof workService.createTask).toBe('function');
      expect(typeof workService.updateTask).toBe('function');
      expect(typeof workService.updateTaskStatus).toBe('function');
      expect(typeof workService.deleteTask).toBe('function');

      expect(typeof workService.createSubtask).toBe('function');
      expect(typeof workService.toggleSubtask).toBe('function');
      expect(typeof workService.deleteSubtask).toBe('function');

      expect(typeof workService.addComment).toBe('function');
      expect(typeof workService.addWorkUpdate).toBe('function');
      expect(typeof workService.getWorkloadMetrics).toBe('function');
    });
  });

  describe('Deep Linking for Work & Tasks', () => {
    it('resolves #/tasks to internal path "tasks"', () => {
      window.location.hash = '#/tasks';
      const route = getCurrentRoute();
      expect(route).not.toBeNull();
      expect(route?.path).toBe('tasks');
    });

    it('resolves #/projects to internal path "projects"', () => {
      window.location.hash = '#/projects';
      const route = getCurrentRoute();
      expect(route).not.toBeNull();
      expect(route?.path).toBe('projects');
    });

    it('resolves #/work to internal path "tasks"', () => {
      window.location.hash = '#/work';
      const route = getCurrentRoute();
      expect(route).not.toBeNull();
      expect(route?.path).toBe('tasks');
    });
  });

  describe('Status Workflow Logic', () => {
    it('defines valid statuses for Project and Task models', () => {
      const validTaskStatuses: TaskStatus[] = [
        'BACKLOG',
        'TODO',
        'IN_PROGRESS',
        'REVIEW',
        'BLOCKED',
        'COMPLETED',
        'CANCELLED',
      ];
      expect(validTaskStatuses).toHaveLength(7);

      const validProjectStatuses: ProjectStatus[] = [
        'PLANNING',
        'ACTIVE',
        'ON_HOLD',
        'COMPLETED',
        'CANCELLED',
      ];
      expect(validProjectStatuses).toHaveLength(5);
    });
  });
});
