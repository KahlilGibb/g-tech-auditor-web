export type CpsStatus = 'Dinilai' | 'Belum Dinilai';

export interface CpsProgressItem {
  id: string;
  title: string;
  site: string;
  score: number | null;
  scoreNote: string;
  date: string;
  templateName: string;
  status: CpsStatus;
}

export interface WeeklyCpsDealer {
  groupId: string;
  dealerName: string;
  totalScore: number;
  sessionsExpected: number;
  maxPossibleScore: number;
  percentage: number;
  sessionsSubmitted: number;
  sessionsLate: number;
}

export interface WeeklyCpsScores {
  weekStart: string;
  weekEnd: string;
  dealers: WeeklyCpsDealer[];
}
