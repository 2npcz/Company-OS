import { supabase, isSupabaseConfigured } from './supabase';
import { resolveOrgId } from './api.client';
import {
  CompanyEvent,
  CompanyEventType,
  UnifiedCalendarItem,
  Holiday,
} from '../types';
import { leaveService } from './leave.service';
import { organizationService } from './organization.service';
import { workService } from './work.service';

// Bangladesh Standard Public & National Holidays (2026 Reference)
export const BANGLADESH_STANDARD_HOLIDAYS: { date: string; name: string; type: 'NATIONAL' | 'ISLAMIC' | 'FESTIVAL' }[] = [
  { date: '2026-02-21', name: 'Shaheed Day & Int. Mother Language Day', type: 'NATIONAL' },
  { date: '2026-03-26', name: 'Independence & National Day', type: 'NATIONAL' },
  { date: '2026-03-20', name: 'Shab-e-Qadr *', type: 'ISLAMIC' },
  { date: '2026-03-21', name: 'Eid-ul-Fitr (Day 1) *', type: 'ISLAMIC' },
  { date: '2026-03-22', name: 'Eid-ul-Fitr (Day 2) *', type: 'ISLAMIC' },
  { date: '2026-03-23', name: 'Eid-ul-Fitr (Day 3) *', type: 'ISLAMIC' },
  { date: '2026-04-14', name: 'Bengali New Year (Pohela Boishakh)', type: 'FESTIVAL' },
  { date: '2026-05-01', name: 'May Day (Workers’ Day)', type: 'NATIONAL' },
  { date: '2026-05-12', name: 'Buddha Purnima *', type: 'FESTIVAL' },
  { date: '2026-05-27', name: 'Eid-ul-Azha (Day 1) *', type: 'ISLAMIC' },
  { date: '2026-05-28', name: 'Eid-ul-Azha (Day 2) *', type: 'ISLAMIC' },
  { date: '2026-05-29', name: 'Eid-ul-Azha (Day 3) *', type: 'ISLAMIC' },
  { date: '2026-06-26', name: 'Ashura (10th Muharram) *', type: 'ISLAMIC' },
  { date: '2026-08-15', name: 'National Mourning Day', type: 'NATIONAL' },
  { date: '2026-08-25', name: 'Eid-e-Miladunnabi *', type: 'ISLAMIC' },
  { date: '2026-09-04', name: 'Janmashtami', type: 'FESTIVAL' },
  { date: '2026-10-20', name: 'Durga Puja (Bijoya Dashami)', type: 'FESTIVAL' },
  { date: '2026-12-16', name: 'Victory Day (Bijoy Dibos)', type: 'NATIONAL' },
  { date: '2026-12-25', name: 'Christmas Day', type: 'FESTIVAL' },
];

async function getCurrentUserId(): Promise<string | undefined> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export const calendarService = {
  // ==========================================
  // COMPANY EVENTS CRUD
  // ==========================================

  async getEvents(filters?: { start?: string; end?: string; type?: CompanyEventType }): Promise<CompanyEvent[]> {
    if (!isSupabaseConfigured()) return [];
    const orgId = await resolveOrgId();
    if (!orgId) return [];

    try {
      let query = supabase
        .from('company_events')
        .select(`
          *,
          creator:profiles!creator_id(id, name),
          department:departments!department_id(id, name)
        `)
        .eq('organization_id', orgId)
        .order('start_time', { ascending: true });

      if (filters?.start) {
        query = query.gte('start_time', filters.start);
      }
      if (filters?.end) {
        query = query.lte('start_time', filters.end);
      }
      if (filters?.type) {
        query = query.eq('event_type', filters.type);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[CalendarService] getEvents error:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        organizationId: row.organization_id,
        title: row.title,
        description: row.description || undefined,
        eventType: row.event_type as CompanyEventType,
        startTime: row.start_time,
        endTime: row.end_time || undefined,
        isAllDay: !!row.is_all_day,
        location: row.location || undefined,
        meetingLink: row.meeting_link || undefined,
        departmentId: row.department_id || undefined,
        departmentName: row.department?.name || undefined,
        creatorId: row.creator_id || undefined,
        creatorName: row.creator?.name || undefined,
        color: row.color || '#4f46e5',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (err: any) {
      console.warn('[CalendarService] getEvents exception:', err?.message || err);
      return [];
    }
  },

  async createEvent(event: Partial<CompanyEvent>): Promise<CompanyEvent | null> {
    if (!isSupabaseConfigured()) return null;
    const orgId = await resolveOrgId();
    if (!orgId) throw new Error('No organization context');
    const currentUserId = await getCurrentUserId();

    const insertPayload: any = {
      organization_id: orgId,
      title: event.title?.trim() || 'Untitled Event',
      description: event.description?.trim() || null,
      event_type: event.eventType || 'EVENT',
      start_time: event.startTime || new Date().toISOString(),
      end_time: event.endTime || null,
      is_all_day: !!event.isAllDay,
      location: event.location?.trim() || null,
      meeting_link: event.meetingLink?.trim() || null,
      department_id: event.departmentId || null,
      creator_id: event.creatorId || currentUserId || null,
      color: event.color || '#4f46e5',
    };

    const { data, error } = await supabase
      .from('company_events')
      .insert([insertPayload])
      .select('*, creator:profiles!creator_id(id, name), department:departments!department_id(id, name)')
      .single();

    if (error) {
      console.error('[CalendarService] createEvent error:', error.message);
      throw error;
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      title: data.title,
      description: data.description || undefined,
      eventType: data.event_type as CompanyEventType,
      startTime: data.start_time,
      endTime: data.end_time || undefined,
      isAllDay: !!data.is_all_day,
      location: data.location || undefined,
      meetingLink: data.meeting_link || undefined,
      departmentId: data.department_id || undefined,
      departmentName: data.department?.name || undefined,
      creatorId: data.creator_id || undefined,
      creatorName: data.creator?.name || undefined,
      color: data.color || '#4f46e5',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateEvent(id: string, updates: Partial<CompanyEvent>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const orgId = await resolveOrgId();
    if (!orgId) return false;

    const payload: any = {
      updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description?.trim() || null;
    if (updates.eventType !== undefined) payload.event_type = updates.eventType;
    if (updates.startTime !== undefined) payload.start_time = updates.startTime;
    if (updates.endTime !== undefined) payload.end_time = updates.endTime || null;
    if (updates.isAllDay !== undefined) payload.is_all_day = updates.isAllDay;
    if (updates.location !== undefined) payload.location = updates.location?.trim() || null;
    if (updates.meetingLink !== undefined) payload.meeting_link = updates.meetingLink?.trim() || null;
    if (updates.departmentId !== undefined) payload.department_id = updates.departmentId || null;
    if (updates.color !== undefined) payload.color = updates.color;

    const { error } = await supabase
      .from('company_events')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('[CalendarService] updateEvent error:', error.message);
      return false;
    }
    return true;
  },

  async deleteEvent(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const orgId = await resolveOrgId();
    if (!orgId) return false;

    const { error } = await supabase
      .from('company_events')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('[CalendarService] deleteEvent error:', error.message);
      return false;
    }
    return true;
  },

  // ==========================================
  // UNIFIED SCHEDULE AGGREGATOR
  // ==========================================

  async getUnifiedCalendar(startDate: string, endDate: string): Promise<UnifiedCalendarItem[]> {
    const items: UnifiedCalendarItem[] = [];

    try {
      const [events, leaves, orgHolidays, tasks, projects] = await Promise.all([
        this.getEvents({ start: startDate, end: endDate }).catch(() => []),
        leaveService.getLeaves().catch(() => []),
        organizationService.getHolidays().catch(() => [] as Holiday[]),
        workService.getTasks().catch(() => []),
        workService.getProjects().catch(() => []),
      ]);

      // 1. Company Events
      events.forEach(e => {
        const dateStr = e.startTime.split('T')[0];
        const timeStr = e.isAllDay
          ? 'All day'
          : new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        items.push({
          id: `event-${e.id}`,
          title: e.title,
          type: 'EVENT',
          date: dateStr,
          time: timeStr,
          color: e.color || '#4f46e5',
          badgeText: e.eventType,
          description: e.description,
          entityId: e.id,
          location: e.location,
          meetingLink: e.meetingLink,
          isAllDay: e.isAllDay,
        });
      });

      // 2. Public & National Holidays (Standard Bangladesh + Org Holidays)
      const allHolidays = [...BANGLADESH_STANDARD_HOLIDAYS];
      orgHolidays.forEach(oh => {
        if (!allHolidays.some(h => h.date === oh.date)) {
          allHolidays.push({ date: oh.date, name: oh.name, type: oh.type || 'FESTIVAL' });
        }
      });

      allHolidays.forEach((h, idx) => {
        if (h.date >= startDate.split('T')[0] && h.date <= endDate.split('T')[0]) {
          items.push({
            id: `holiday-${h.date}-${idx}`,
            title: h.name,
            type: 'HOLIDAY',
            date: h.date,
            time: 'All day',
            color: '#d97706', // amber
            badgeText: 'Holiday',
            description: `Official Bangladesh Holiday (${h.type})`,
            isAllDay: true,
          });
        }
      });

      // 3. Approved Leaves
      leaves.forEach(l => {
        if (l.status === 'APPROVED' && l.startDate && l.endDate) {
          const lStart = l.startDate.split(' ')[0].split('T')[0];
          const lEnd = l.endDate.split(' ')[0].split('T')[0];

          // Check if overlaps window
          if (lEnd >= startDate.split('T')[0] && lStart <= endDate.split('T')[0]) {
            items.push({
              id: `leave-${l.id}`,
              title: `${l.employeeName || 'Employee'} (${l.type} Leave)`,
              type: 'LEAVE',
              date: lStart,
              endDate: lEnd !== lStart ? lEnd : undefined,
              time: 'All day',
              color: '#059669', // emerald
              badgeText: 'On Leave',
              description: l.reason || undefined,
              assigneeName: l.employeeName,
              entityId: l.id,
              isAllDay: true,
            });
          }
        }
      });

      // 4. Tasks (Due Dates)
      tasks.forEach(t => {
        if (t.dueDate) {
          const dStr = t.dueDate.split('T')[0];
          if (dStr >= startDate.split('T')[0] && dStr <= endDate.split('T')[0]) {
            const isCompleted = t.status === 'COMPLETED';
            items.push({
              id: `task-${t.id}`,
              title: `${t.title} ${t.projectName ? `[${t.projectName}]` : ''}`,
              type: 'TASK',
              date: dStr,
              time: 'Deadline',
              color: isCompleted ? '#6b7280' : t.priority === 'URGENT' ? '#dc2626' : '#2563eb',
              badgeText: t.status === 'COMPLETED' ? 'Done' : 'Task Due',
              description: t.description,
              assigneeName: t.assigneeName,
              assigneeAvatar: t.assigneeAvatar,
              entityId: t.id,
              isAllDay: true,
            });
          }
        }
      });

      // 5. Projects (Target Dates)
      projects.forEach(p => {
        if (p.targetDate) {
          const dStr = p.targetDate.split('T')[0];
          if (dStr >= startDate.split('T')[0] && dStr <= endDate.split('T')[0]) {
            items.push({
              id: `project-${p.id}`,
              title: `Project Milestone: ${p.name}`,
              type: 'PROJECT',
              date: dStr,
              time: 'Milestone',
              color: '#7c3aed', // purple
              badgeText: 'Project Target',
              description: p.description,
              entityId: p.id,
              isAllDay: true,
            });
          }
        }
      });
    } catch (err) {
      console.warn('[CalendarService] getUnifiedCalendar error:', err);
    }

    // Sort by date, then by time
    items.sort((a, b) => a.date.localeCompare(b.date));

    return items;
  },
};
