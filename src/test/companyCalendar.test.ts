import { describe, it, expect } from 'vitest';
import { calendarService, BANGLADESH_STANDARD_HOLIDAYS } from '../services/calendar.service';
import { getCurrentRoute } from '../utils/deeplink';

describe('Company Calendar — Phase 4', () => {
  describe('calendarService API contracts', () => {
    it('exports all expected calendar service functions', () => {
      expect(typeof calendarService.getEvents).toBe('function');
      expect(typeof calendarService.createEvent).toBe('function');
      expect(typeof calendarService.updateEvent).toBe('function');
      expect(typeof calendarService.deleteEvent).toBe('function');
      expect(typeof calendarService.getUnifiedCalendar).toBe('function');
    });

    it('contains comprehensive Bangladesh standard holidays', () => {
      expect(BANGLADESH_STANDARD_HOLIDAYS.length).toBeGreaterThanOrEqual(15);
      const names = BANGLADESH_STANDARD_HOLIDAYS.map(h => h.name);
      expect(names.some(n => n.includes('Mother Language Day'))).toBe(true);
      expect(names.some(n => n.includes('Independence'))).toBe(true);
      expect(names.some(n => n.includes('Eid-ul-Fitr'))).toBe(true);
      expect(names.some(n => n.includes('Victory Day'))).toBe(true);
    });
  });

  describe('Deep Linking for Calendar', () => {
    it('resolves #/calendar to internal path "calendar"', () => {
      window.location.hash = '#/calendar';
      const route = getCurrentRoute();
      expect(route).not.toBeNull();
      expect(route?.path).toBe('calendar');
    });
  });
});
