import { apiClient, MockInterceptError } from '../lib/apiClient';
import { API_ENDPOINTS } from '../constants/api';
import { unwrapData, toRecord } from '../lib/apiResponse';
import type { WeeklyCpsScores } from '../types/cps';
import { inspectionService } from './inspectionService';

export const cpsService = {
  async getWeeklyScores(weekStart?: string): Promise<WeeklyCpsScores> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CPS.WEEKLY_SCORES, {
        params: { week_start: weekStart },
      });
      const data = toRecord(unwrapData(response.data));
      
      const dealers = Array.isArray(data.dealers)
        ? data.dealers.map((d: unknown) => {
            const rec = toRecord(d);
            return {
              groupId: String(rec.group_id || ''),
              dealerName: String(rec.dealer_name || rec.group_name || ''),
              totalScore: Number(rec.total_score || 0),
              sessionsExpected: Number(rec.sessions_expected || 0),
              maxPossibleScore: Number(rec.max_possible_score || 0),
              percentage: Number(rec.percentage || 0),
              sessionsSubmitted: Number(rec.sessions_submitted || 0),
              sessionsLate: Number(rec.sessions_late || 0),
            };
          })
        : [];

      return {
        weekStart: String(data.week_start || weekStart || ''),
        weekEnd: String(data.week_end || ''),
        dealers,
      };
    } catch (error) {
      if (error instanceof MockInterceptError) {
        await new Promise<void>(resolve => setTimeout(resolve, 300));
        // Return mock data ranked by percentage
        return {
          weekStart: weekStart || '2026-06-29',
          weekEnd: '2026-07-06',
          dealers: [
            {
              groupId: 'branch-pik',
              dealerName: 'Dealer KIA PIK',
              totalScore: 1080,
              sessionsExpected: 12,
              maxPossibleScore: 1200,
              percentage: 90,
              sessionsSubmitted: 11,
              sessionsLate: 2,
            },
            {
              groupId: 'branch-sunter',
              dealerName: 'Dealer Sunter',
              totalScore: 960,
              sessionsExpected: 12,
              maxPossibleScore: 1200,
              percentage: 80,
              sessionsSubmitted: 10,
              sessionsLate: 1,
            },
            {
              groupId: 'branch-bsd',
              dealerName: 'Dealer Audi VW BSD',
              totalScore: 840,
              sessionsExpected: 12,
              maxPossibleScore: 1200,
              percentage: 70,
              sessionsSubmitted: 9,
              sessionsLate: 3,
            },
          ],
        };
      }
      throw error;
    }
  },

  async getCpsSession(cpsId: string): Promise<import('../types/inspection').InspectionSession> {
    try {
      const session = await inspectionService.getInspectionWithTemplate(cpsId);
      
      // Normalize option labels
      const normalizedSections = (session.sections || []).map(sec => ({
        ...sec,
        fields: (sec.fields || []).map(field => {
          const options = field.options?.map(opt => {
            const val = String(opt.value || '').toLowerCase();
            let label = opt.label;
            if (val === 'yes') label = 'Yes';
            if (val === 'no') label = 'No';
            if (val === 'n/a' || val === 'na') label = 'N/A';
            return { ...opt, label };
          });
          return { ...field, options };
        })
      }));

      return {
        ...session,
        sections: normalizedSections
      };
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 400));
        // Return dummy session for local testing
        return {
          inspectionId: cpsId,
          templateId: 'cps-tmpl-1',
          templateTitle: 'Daily CPS Sunter',
          status: 'active',
          site: 'Dealer Sunter',
          assignee: 'Doni Darmawan',
          dueDate: new Date(Date.now() + 24*60*60*1000).toISOString(),
          startedAt: new Date().toISOString(),
          currentSectionIndex: 0,
          responses: {},
          sections: [
            {
              id: 'sec-1',
              title: 'General Inspection',
              order: 1,
              fields: [
                {
                  id: 'f-1',
                  section_id: 'sec-1',
                  master_field_id: null,
                  label: 'Apakah kebersihan lantai bengkel terjaga?',
                  type: 'pass_fail',
                  required: true,
                  order: 1,
                  rules: null,
                  options: [
                    { id: 'o-1', field_id: 'f-1', label: 'Yes', value: 'yes', score_value: 10 },
                    { id: 'o-2', field_id: 'f-1', label: 'No', value: 'no', score_value: 0 },
                    { id: 'o-3', field_id: 'f-1', label: 'N/A', value: 'na', score_value: 0 }
                  ]
                },
                {
                  id: 'f-2',
                  section_id: 'sec-1',
                  master_field_id: null,
                  label: 'SOP Briefing Pagi sudah dilakukan?',
                  type: 'pass_fail',
                  required: true,
                  order: 2,
                  rules: null,
                  options: [
                    { id: 'o-4', field_id: 'f-2', label: 'Yes', value: 'yes', score_value: 10 },
                    { id: 'o-5', field_id: 'f-2', label: 'No', value: 'no', score_value: 0 }
                  ]
                }
              ]
            }
          ]
        };
      }
      throw e;
    }
  },

  async submitCps(cpsId: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.INSPECTIONS.SUBMIT(cpsId));
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 300));
        return;
      }
      throw e;
    }
  },
};
