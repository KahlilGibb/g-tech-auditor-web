import type {
  InspectionDetail,
  InspectionSection,
  InspectionSession,
  InspectionSummary,
} from '../types/inspection';
import type { TemplateField } from '../types/template';
import { apiClient, MockInterceptError } from '../lib/apiClient';
import { API_ENDPOINTS } from '../constants/api';
import { toRecord, toStringValue, unwrapData, unwrapList } from '../lib/apiResponse';
import { templateService } from './templateService';

// TODO: Remove MOCK_DATA when real API is connected.
const MOCK_INSPECTIONS: InspectionSummary[] = [
  {
    id: 'INS-001',
    templateId: 'TEMP-W01',
    title: 'Warehouse Safety Check',
    site: 'Central Logistics Park',
    assignee: 'John Doe',
    dueDate: '2026-04-20T10:00:00Z',
    templateName: 'Monthly Safety Audit',
    status: 'Complete',
    progress: { completed: 24, total: 24 },
    score: '92%',
    startedAt: '2026-04-19T08:00:00Z',
  },
  {
    id: 'INS-002',
    templateId: 'TEMP-E01',
    title: 'Electrical Maintenance',
    site: 'East Wing Production',
    assignee: 'Sarah Smith',
    dueDate: '2026-04-19T17:00:00Z',
    templateName: 'Equipment Service Log',
    status: 'In Progress',
    progress: { completed: 12, total: 40 },
    startedAt: '2026-04-19T13:00:00Z',
  },
  {
    id: 'INS-003',
    templateId: 'TEMP-F01',
    title: 'Fire Drill Audit',
    site: 'HQ Office',
    assignee: 'Mike Ross',
    dueDate: '2026-04-18T09:00:00Z',
    templateName: 'Emergency Readiness',
    status: 'Complete',
    progress: { completed: 15, total: 15 },
    score: '100%',
    startedAt: '2026-04-18T08:30:00Z',
  },
  {
    id: 'INS-004',
    templateId: 'TEMP-Q01',
    title: 'Equipment Inspection',
    site: 'Main Workshop',
    assignee: 'Anna Bell',
    dueDate: '2026-04-17T15:00:00Z',
    templateName: 'Daily QC Check',
    status: 'Overdue',
    progress: { completed: 5, total: 20 },
    score: '64%',
    startedAt: '2026-04-17T09:00:00Z',
  },
];

function normalizeStatus(value: unknown): InspectionSummary['status'] {
  const text = toStringValue(value, 'Draft').toLowerCase();
  if (text.includes('complete') || text.includes('submitted') || text.includes('selesai')) return 'Complete';
  if (text.includes('progress') || text.includes('active') || text.includes('berjalan')) return 'In Progress';
  if (text.includes('overdue') || text.includes('late') || text.includes('terlambat')) return 'Overdue';
  return 'Draft';
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeProgress(raw: unknown, fallbackTotal = 0) {
  const record = toRecord(raw);
  const completed = toNumber(record.completed ?? record.answered ?? record.done, 0);
  const total = toNumber(record.total ?? record.count, fallbackTotal);
  return { completed, total };
}

function normalizeInspection(raw: unknown): InspectionSummary {
  const record = toRecord(raw);
  const template = toRecord(record.template);
  const site = toRecord(record.site);
  const assignee = toRecord(record.assignee ?? record.user ?? record.auditor);
  const id = toStringValue(record.id ?? record.inspection_id ?? record.uuid);
  const templateId = toStringValue(record.template_id ?? record.templateId ?? template.id);
  const title =
    toStringValue(record.title ?? record.name) ||
    `${toStringValue(template.title ?? template.name, 'Inspection')} / ${toStringValue(site.name, '-')}`;

  return {
    id,
    templateId,
    title,
    site: toStringValue(record.site_name ?? site.name ?? record.site, '-'),
    assignee: toStringValue(record.assignee_name ?? assignee.name ?? assignee.full_name ?? record.assignee, '-'),
    dueDate: toStringValue(record.due_date ?? record.dueDate ?? record.deadline, new Date().toISOString()),
    templateName: toStringValue(record.template_name ?? template.title ?? template.name, 'Inspection Template'),
    status: normalizeStatus(record.status),
    progress: normalizeProgress(record.progress, toNumber(record.total_questions ?? record.question_count, 0)),
    score: toStringValue(record.score ?? record.final_score) || undefined,
    startedAt: toStringValue(record.started_at ?? record.startedAt) || undefined,
  };
}

function option(fieldId: string, label: string, value: string, score = 0) {
  return { id: `${fieldId}-${value}`, field_id: fieldId, label, value, score_value: score };
}

function field(
  id: string,
  sectionId: string,
  label: string,
  type: TemplateField['type'],
  required: boolean,
  order: number,
  extra?: Partial<TemplateField>,
): TemplateField {
  return {
    id,
    section_id: sectionId,
    master_field_id: null,
    label,
    type,
    required,
    order,
    logic_rules: null,
    ...extra,
  };
}

function mockSections(): InspectionSection[] {
  const pf = (fieldId: string) => ({
    options: [
      option(fieldId, 'OK', 'ok', 1),
      option(fieldId, 'Not OK', 'not_ok', 0),
      option(fieldId, 'N/A', 'na', 0),
    ],
  });

  const condition = (fieldId: string) => ({
    options: [
      option(fieldId, 'Sangat Baik', 'very_good', 3),
      option(fieldId, 'Baik', 'good', 2),
      option(fieldId, 'Cukup', 'fair', 1),
      option(fieldId, 'Kurang', 'poor', 0),
    ],
  });

  return [
    {
      id: 'sec-title',
      title: 'Title Page',
      order: 1,
      fields: [
        field('f-title-date', 'sec-title', 'Tanggal Inspeksi', 'inspection_date', true, 1),
        field('f-title-dealer', 'sec-title', 'Nama & Kode Dealer', 'text_answer', true, 2),
        field('f-title-address', 'sec-title', 'Alamat Lengkap Dealer', 'text_answer', true, 3),
        field('f-title-auditor', 'sec-title', 'Nama Auditor / Pemeriksa', 'person', true, 4),
      ],
    },
    {
      id: 'sec-parking',
      title: 'Area Parkir Kendaraan Tamu',
      order: 2,
      fields: [
        field(
          'f-parking-info',
          'sec-parking',
          'Periksa kebersihan, marka, signage, aksesibilitas, dan dokumentasikan temuan utama.',
          'instruction',
          false,
          1,
        ),
        field('f-parking-photo', 'sec-parking', 'Foto kondisi keseluruhan area parkir tamu', 'photo', true, 2),
        field('f-parking-clean', 'sec-parking', 'Kebersihan area parkir bebas sampah dan oli', 'pass_fail', true, 3, pf('f-parking-clean')),
        field('f-parking-mark', 'sec-parking', 'Marka parkir terlihat jelas', 'pass_fail', true, 4, pf('f-parking-mark')),
        field('f-parking-slots', 'sec-parking', 'Jumlah slot parkir tersedia', 'number', true, 5),
        field('f-parking-note', 'sec-parking', 'Catatan & temuan area parkir', 'text_answer', false, 6),
      ],
    },
    {
      id: 'sec-showroom',
      title: 'Showroom Interior',
      order: 3,
      fields: [
        field('f-showroom-photo', 'sec-showroom', 'Foto panorama showroom', 'photo', true, 1),
        field('f-showroom-floor', 'sec-showroom', 'Kebersihan lantai showroom', 'pass_fail', true, 2, pf('f-showroom-floor')),
        field('f-showroom-light', 'sec-showroom', 'Pencahayaan terang dan merata', 'pass_fail', true, 3, pf('f-showroom-light')),
        field('f-showroom-condition', 'sec-showroom', 'Kondisi umum area showroom', 'dropdown', true, 4, condition('f-showroom-condition')),
        field('f-showroom-note', 'sec-showroom', 'Catatan showroom', 'text_answer', false, 5),
      ],
    },
    {
      id: 'sec-closing',
      title: 'Tanda Tangan & Penutup',
      order: 4,
      fields: [
        field('f-closing-summary', 'sec-closing', 'Kesimpulan & rekomendasi tindak lanjut', 'text_answer', true, 1),
        field('f-closing-auditor', 'sec-closing', 'Tanda tangan Auditor / Pemeriksa', 'signature', true, 2),
        field('f-closing-manager', 'sec-closing', 'Tanda tangan Kepala Dealer / Branch Manager', 'signature', true, 3),
      ],
    },
  ];
}

function normalizeResponses(raw: unknown) {
  const list = Array.isArray(raw) ? raw : unwrapList<unknown>(raw);
  return Object.fromEntries(
    list.map(item => {
      const record = toRecord(item);
      const fieldId = toStringValue(record.field_id ?? record.fieldId);
      return [
        fieldId,
        {
          fieldId,
          value: record.value ?? record.answer ?? record.response_value,
          note: toStringValue(record.note ?? record.notes) || undefined,
          mediaUris: Array.isArray(record.mediaUris)
            ? record.mediaUris.map(value => toStringValue(value)).filter(Boolean)
            : Array.isArray(record.media_uris)
              ? record.media_uris.map(value => toStringValue(value)).filter(Boolean)
              : undefined,
          answeredAt: toStringValue(record.answered_at ?? record.answeredAt) || undefined,
        },
      ];
    }).filter(([fieldId]) => Boolean(fieldId)),
  );
}

function sectionsFromTemplate(
  sections: Awaited<ReturnType<typeof templateService.getTemplateWithVersion>>['sections'],
  fields: Awaited<ReturnType<typeof templateService.getTemplateWithVersion>>['fields'],
): InspectionSection[] {
  return sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(section => ({
      id: section.id,
      title: section.title,
      order: section.order,
      fields: (fields[section.id] ?? []).slice().sort((a, b) => a.order - b.order),
    }));
}

export interface DashboardStatsResponse {
  totalInspections: number;
  totalInspectionsChange: string;
  activeIssues: number;
  activeIssuesChange: string;
  auditorsOnline: number;
  auditorsOnlineChange: string;
  avgCompliance: string;
  avgComplianceChange: string;
}

export const inspectionService = {
  async getInspections(): Promise<InspectionSummary[]> {
    try {
      const res = await apiClient.get<unknown>(API_ENDPOINTS.INSPECTIONS.LIST, {
        params: { page: 1, limit: 50 },
      });
      return unwrapList<unknown>(res.data).map(normalizeInspection);
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 600));
        return [...MOCK_INSPECTIONS];
      }
      throw e;
    }
  },

  async getInspection(id: string): Promise<InspectionDetail> {
    try {
      const res = await apiClient.get<unknown>(API_ENDPOINTS.INSPECTIONS.DETAIL(id));
      const detail = normalizeInspection(unwrapData(res.data));
      const record = toRecord(unwrapData(res.data));
      return {
        ...detail,
        responses: Object.values(normalizeResponses(record.responses ?? record.field_values)),
        createdAt: toStringValue(record.created_at ?? record.createdAt, new Date().toISOString()),
        submittedAt: toStringValue(record.submitted_at ?? record.submittedAt) || null,
      };
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 300));
        const found = MOCK_INSPECTIONS.find(item => item.id === id);
        if (!found) throw new Error(`Inspection ${id} not found`);
        return { ...found, responses: [], createdAt: new Date().toISOString(), submittedAt: null };
      }
      throw e;
    }
  },

  async getInspectionWithTemplate(id: string): Promise<InspectionSession> {
    try {
      const detail = await this.getInspection(id);
      const tree = detail.templateId
        ? await templateService.getTemplateWithVersion(detail.templateId).catch(() => null)
        : null;
      const sections = tree ? sectionsFromTemplate(tree.sections, tree.fields) : mockSections();

      return {
        inspectionId: detail.id,
        templateId: detail.templateId,
        templateTitle: detail.templateName,
        sections,
        responses: Object.fromEntries(detail.responses.map(response => [response.fieldId, response])),
        currentSectionIndex: 0,
        status: detail.status === 'Complete' ? 'submitted' : 'active',
        site: detail.site,
        assignee: detail.assignee,
        dueDate: detail.dueDate,
        startedAt: detail.startedAt ?? detail.createdAt,
      };
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 400));
        const found = MOCK_INSPECTIONS.find(item => item.id === id);
        if (!found) throw new Error(`Inspection ${id} not found`);
        return {
          inspectionId: found.id,
          templateId: found.templateId,
          templateTitle: found.templateName,
          sections: mockSections(),
          responses: {},
          currentSectionIndex: 0,
          status: found.status === 'Complete' ? 'submitted' : 'active',
          site: found.site,
          assignee: found.assignee,
          dueDate: found.dueDate,
          startedAt: found.startedAt ?? new Date().toISOString(),
        };
      }
      throw e;
    }
  },

  async saveInspectionDraft(session: InspectionSession): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.INSPECTIONS.FIELD_VALUES(session.inspectionId), {
        values: Object.values(session.responses).map(response => ({
          field_id: response.fieldId,
          value: response.value,
          note: response.note,
          media_uris: response.mediaUris,
          answered_at: response.answeredAt,
        })),
      });
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 250));
        return;
      }
      throw e;
    }
  },

  async submitInspection(session: InspectionSession): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.INSPECTIONS.SUBMIT(session.inspectionId), {
        responses: Object.values(session.responses).map(response => ({
          field_id: response.fieldId,
          value: response.value,
          note: response.note,
          media_uris: response.mediaUris,
          answered_at: response.answeredAt,
        })),
      });
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 600));
        const idx = MOCK_INSPECTIONS.findIndex(item => item.id === session.inspectionId);
        if (idx !== -1) {
          MOCK_INSPECTIONS[idx] = {
            ...MOCK_INSPECTIONS[idx],
            status: 'Complete',
            progress: { completed: MOCK_INSPECTIONS[idx].progress.total, total: MOCK_INSPECTIONS[idx].progress.total },
          };
        }
        return;
      }
      throw e;
    }
  },

  async getDashboardStats(): Promise<DashboardStatsResponse> {
    try {
      const res = await apiClient.get<DashboardStatsResponse>(API_ENDPOINTS.INSPECTIONS.DASHBOARD_STATS);
      return res.data;
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 400));
        return {
          totalInspections: 1284,
          totalInspectionsChange: '+12%',
          activeIssues: 24,
          activeIssuesChange: '+4',
          auditorsOnline: 18,
          auditorsOnlineChange: '+2',
          avgCompliance: '88.4%',
          avgComplianceChange: '+2.4%',
        };
      }
      throw e;
    }
  }
};
