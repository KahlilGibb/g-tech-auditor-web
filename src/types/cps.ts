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
