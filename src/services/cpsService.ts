import { apiClient, MockInterceptError } from '../lib/apiClient';
import { API_ENDPOINTS } from '../constants/api';
import { unwrapData, toRecord } from '../lib/apiResponse';
import type { WeeklyCpsScores } from '../types/cps';

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
};
