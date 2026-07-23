import type {
  InspectionDetail,
  InspectionSection,
  InspectionSession,
  InspectionSummary,
  CreateInspectionPayload,
  DashboardData,
} from '../types/inspection';
import type { TemplateField } from '../types/template';
import { apiClient, MockInterceptError } from '../lib/apiClient';
import { API_ENDPOINTS } from '../constants/api';
import { toRecord, toStringValue, unwrapData, unwrapList } from '../lib/apiResponse';
import { templateService } from './templateService';

// TODO: Remove MOCK_DATA when real API is connected.
let MOCK_TRASHED_INSPECTIONS: InspectionSummary[] = [];
let MOCK_INSPECTIONS: InspectionSummary[] = [
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
  const templateId = toStringValue(record.template_id ?? record.templateId ?? template.template_id ?? template.templateId ?? template.id);
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

function normalizeDashboardData(raw: unknown): DashboardData {
  const record = toRecord(raw);
  const countsRecord = toRecord(record.counts);
  const rawInProgress = record.in_progress ?? record.inProgress;
  const inProgressList = Array.isArray(rawInProgress)
    ? (rawInProgress as unknown[]).map(toRecord)
    : [];
  const rawTopDealers = record.top_dealers ?? record.topDealers;
  const topDealersList = Array.isArray(rawTopDealers)
    ? (rawTopDealers as unknown[]).map(toRecord)
    : [];

  return {
    counts: {
      completed: toNumber(countsRecord.completed, 0),
      active: toNumber(countsRecord.active, 0),
      draft: toNumber(countsRecord.draft, 0),
      overdue: toNumber(countsRecord.overdue, 0),
    },
    inProgress: inProgressList.map((item: Record<string, any>) => ({
      id: toStringValue(item.id ?? item.inspection_id ?? item.uuid),
      title: toStringValue(item.title ?? item.name, 'Inspection'),
      groupName: toStringValue(item.group_name ?? item.groupName ?? item.site, '-'),
      templateTitle: toStringValue(item.template_title ?? item.templateTitle ?? item.templateName, 'Inspection Template'),
      templateType: toStringValue(item.template_type ?? item.templateType ?? item.type, 'inspection'),
      updatedAt: toStringValue(item.updated_at ?? item.updatedAt, new Date().toISOString()),
      status: toStringValue(item.status, 'In Progress'),
      progress: item.progress ?? { completed: 0, total: 10 },
    })),
    topDealers: topDealersList.map((item: Record<string, any>) => ({
      groupId: toStringValue(item.group_id ?? item.groupId),
      groupName: toStringValue(item.group_name ?? item.groupName ?? item.name, '-'),
      total: toNumber(item.total, 0),
      completed: toNumber(item.completed, 0),
      percent: toNumber(item.percent ?? item.pct, 0),
    })),
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
    rules: null,
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
      
      const isArrayValue = Array.isArray(record.value);
      const attachmentsList = isArrayValue
        ? (record.value as string[]).map(url => ({
            uri: toStringValue(url),
            file_url: toStringValue(url),
            file_type: 'image/jpeg',
            filename: toStringValue(url).split('/').pop() ?? toStringValue(url),
            type: (record.note_type === 'issue' ? 'issue' : 'general') as 'issue' | 'general',
          }))
        : Array.isArray(record.attachments)
          ? record.attachments.map(a => {
              const att = toRecord(a);
              return {
                uri: toStringValue(att.file_url),
                attachment_id: toStringValue(att.id),
                file_url: toStringValue(att.file_url),
                file_type: toStringValue(att.file_type),
                filename: toStringValue(att.filename),
                type: toStringValue(att.type) as 'issue' | 'general',
              };
            })
          : [];

      let finalValue = record.value ?? record.answer ?? record.response_value;
      if (typeof finalValue === 'object' && finalValue !== null && !Array.isArray(finalValue)) {
        const obj = finalValue as Record<string, unknown>;
        finalValue = obj.answer ?? obj.value ?? finalValue;
      }

      return [
        fieldId,
        {
          fieldId,
          fieldValueId: toStringValue(record.id || record.field_value_id),
          value: finalValue,
          note: toStringValue(record.note ?? record.notes) || undefined,
          noteType: toStringValue(record.note_type ?? record.noteType) || undefined,
          attachments: attachmentsList,
          mediaUris: attachmentsList.length
            ? attachmentsList.map(a => a.uri).filter(Boolean)
            : Array.isArray(record.mediaUris)
              ? record.mediaUris.map(value => toStringValue(value)).filter(Boolean)
              : Array.isArray(record.media_uris)
                ? record.media_uris.map(value => toStringValue(value)).filter(Boolean)
                : [],
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
  async getDashboard(limit = 5): Promise<DashboardData> {
    try {
      const res = await apiClient.get<unknown>('/dashboard', {
        params: { limit },
      });
      return normalizeDashboardData(unwrapData(res.data));
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 450));
        return {
          counts: { completed: 5, active: 15, draft: 17, overdue: 0 },
          inProgress: MOCK_INSPECTIONS.filter(i => i.status !== 'Complete').map(i => ({
            id: i.id,
            title: i.title,
            groupName: i.site,
            templateTitle: i.templateName,
            templateType: 'inspection',
            updatedAt: i.startedAt || new Date().toISOString(),
            status: i.status,
            progress: i.progress,
          })),
          topDealers: [
            { groupId: 'g1', groupName: 'Dealer Audi VW BSD', total: 5, completed: 3, percent: 60 },
            { groupId: 'g2', groupName: 'Dealer Nissan Pulo Gadung', total: 7, completed: 4, percent: 57 },
            { groupId: 'g3', groupName: 'Dealer KIA PIK', total: 10, completed: 5, percent: 50 },
            { groupId: 'g4', groupName: 'Dealer Nissan Sempaja', total: 15, completed: 7, percent: 47 },
            { groupId: 'g5', groupName: 'Dealer Nissan Aceh', total: 20, completed: 8, percent: 43 },
          ],
        };
      }
      throw e;
    }
  },

  async createInspection(payload: CreateInspectionPayload): Promise<InspectionDetail> {
    try {
      const apiPayload = {
        template_id: payload.templateId,
        group_id: payload.groupId || payload.site,
        title: payload.title || `Inspection / ${payload.site}`,
      };
      const res = await apiClient.post<unknown>(
        API_ENDPOINTS.INSPECTIONS.CREATE,
        apiPayload,
      );
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
        await new Promise<void>(r => setTimeout(r, 400));
        const id = `INS-${Math.random().toString(36).substring(2, 11)}`;
        const t = new Date().toISOString();
        const mock: InspectionSummary = {
          id,
          templateId: payload.templateId,
          title: `Inspection / ${payload.site}`,
          site: payload.site,
          assignee: payload.assignee,
          dueDate: payload.dueDate,
          templateName: 'Inspection Template',
          status: 'In Progress',
          progress: { completed: 0, total: 10 },
          startedAt: t,
        };
        MOCK_INSPECTIONS.push(mock);
        return {
          ...mock,
          responses: [],
          createdAt: t,
          submittedAt: null,
        };
      }
      throw e;
    }
  },

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

  async saveInspectionDraft(): Promise<void> {
    // No-op because fields are dynamically upserted as they are answered in the new implementation.
  },

  async upsertFieldValue(
    inspectionId: string,
    payload: {
      field_id: string;
      value: unknown;
      note?: string;
      note_type?: string;
    },
  ): Promise<{ id: string }> {
    try {
      const res = await apiClient.put<unknown>(
        API_ENDPOINTS.INSPECTIONS.FIELD_VALUES(inspectionId),
        payload,
      );
      return unwrapData<{ id: string }>(res.data);
    } catch (e) {
      if (e instanceof MockInterceptError) {
        return { id: `fv-${payload.field_id}` };
      }
      throw e;
    }
  },

  async uploadAttachment(
    inspectionId: string,
    formData: FormData,
  ): Promise<{ file_url: string; filename: string; file_type: string }> {
    try {
      const res = await apiClient.post<unknown>(
        API_ENDPOINTS.INSPECTIONS.ATTACHMENT_UPLOAD(inspectionId),
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const data = unwrapData<any>(res.data);
      if (Array.isArray(data)) return data[0];
      return data;
    } catch (e) {
      if (e instanceof MockInterceptError) {
        return {
          file_url: 'https://example.com/mock-photo.jpg',
          filename: 'mock-photo.jpg',
          file_type: 'image/jpeg',
        };
      }
      throw e;
    }
  },

  async createAttachment(
    inspectionId: string,
    payload: {
      field_value_id: string;
      file_url: string;
      file_type: string;
      filename: string;
      type: string;
    },
  ): Promise<{ id: string }> {
    try {
      const res = await apiClient.post<unknown>(
        API_ENDPOINTS.INSPECTIONS.ATTACHMENTS(inspectionId),
        payload,
      );
      return unwrapData<{ id: string }>(res.data);
    } catch (e) {
      if (e instanceof MockInterceptError) {
        return { id: `att-${Date.now()}` };
      }
      throw e;
    }
  },

  async deleteAttachment(
    inspectionId: string,
    attachmentId: string,
  ): Promise<void> {
    try {
      await apiClient.delete(
        API_ENDPOINTS.INSPECTIONS.ATTACHMENT(inspectionId, attachmentId),
      );
    } catch (e) {
      if (e instanceof MockInterceptError) {
        return;
      }
      throw e;
    }
  },

  async submitInspection(inspectionId: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.INSPECTIONS.SUBMIT(inspectionId));
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 600));
        const idx = MOCK_INSPECTIONS.findIndex(item => item.id === inspectionId);
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

  async exportReport(inspectionId: string): Promise<Blob> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.INSPECTIONS.EXPORT_REPORT(inspectionId), {
        responseType: 'blob',
      });
      return res.data as Blob;
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 300));
        return new Blob([`Mock inspection report for ${inspectionId}`], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }
      throw e;
    }
  },

  async exportIssues(inspectionId: string): Promise<Blob> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.INSPECTIONS.EXPORT_ISSUES(inspectionId), {
        responseType: 'blob',
      });
      return res.data as Blob;
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 300));
        return new Blob([`Mock inspection issues for ${inspectionId}`], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }
      throw e;
    }
  },

  async getDashboardStats(): Promise<DashboardStatsResponse> {
    try {
      const res = await apiClient.get<any>(API_ENDPOINTS.INSPECTIONS.DASHBOARD_STATS);
      const data = unwrapData(res.data) as any;
      const resData = res.data as any;
      const counts = (data?.counts || resData?.counts || { completed: 0, active: 0, draft: 0 }) as any;
      const total = (counts.completed || 0) + (counts.active || 0) + (counts.draft || 0);
      return {
        totalInspections: total,
        totalInspectionsChange: '',
        activeIssues: counts.active || 0,
        activeIssuesChange: '',
        auditorsOnline: 0,
        auditorsOnlineChange: '',
        avgCompliance: '0%',
        avgComplianceChange: '',
      };
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
  },

  async deleteInspection(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.INSPECTIONS.DELETE(id));
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 200));
        const found = MOCK_INSPECTIONS.find(item => item.id === id);
        if (found) {
          MOCK_TRASHED_INSPECTIONS.push(found);
          MOCK_INSPECTIONS = MOCK_INSPECTIONS.filter(item => item.id !== id);
        }
        return;
      }
      throw e;
    }
  },

  async listTrashedInspections(): Promise<InspectionSummary[]> {
    try {
      const res = await apiClient.get<unknown>(API_ENDPOINTS.INSPECTIONS.TRASH);
      return unwrapList<unknown>(res.data).map(normalizeInspection);
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 200));
        return [...MOCK_TRASHED_INSPECTIONS];
      }
      throw e;
    }
  },

  async restoreInspection(id: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.INSPECTIONS.RESTORE(id));
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 200));
        const found = MOCK_TRASHED_INSPECTIONS.find(item => item.id === id);
        if (found) {
          MOCK_INSPECTIONS.push(found);
          MOCK_TRASHED_INSPECTIONS = MOCK_TRASHED_INSPECTIONS.filter(item => item.id !== id);
        }
        return;
      }
      throw e;
    }
  },

  async permanentDeleteInspection(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.INSPECTIONS.PERMANENT_DELETE(id));
    } catch (e) {
      if (e instanceof MockInterceptError) {
        await new Promise<void>(r => setTimeout(r, 200));
        MOCK_TRASHED_INSPECTIONS = MOCK_TRASHED_INSPECTIONS.filter(item => item.id !== id);
        return;
      }
      throw e;
    }
  },
};
