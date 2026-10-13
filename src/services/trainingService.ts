import { API_ENDPOINTS } from '../constants/api';
import { apiClient } from '../lib/apiClient';
import { toRecord, unwrapData, unwrapList } from '../lib/apiResponse';
import type { ListResult } from '../types/management';
import type {
  CreateMaterialRequest, CreateScheduleRequest, TrainingContent, TrainingDocument,
  TrainingGroup, TrainingListQuery, TrainingMaterial, TrainingSchedule,
  UpdateMaterialRequest, UpdateScheduleRequest,
} from '../types/training';

async function list<T>(url: string, params: TrainingListQuery, signal?: AbortSignal): Promise<ListResult<T>> {
  const response = await apiClient.get<unknown>(url, { params, signal });
  const meta = toRecord(toRecord(response.data).meta);
  return {
    items: unwrapList<T>(response.data),
    meta: { total: Number(meta.total ?? 0), page: Number(meta.page ?? params.page ?? 1), limit: Number(meta.limit ?? params.limit ?? 20) },
  };
}

export const trainingService = {
  getMaterials: (params: TrainingListQuery, signal?: AbortSignal) => list<TrainingMaterial>(API_ENDPOINTS.TRAINING.MATERIALS, params, signal),
  getSchedules: (params: TrainingListQuery, signal?: AbortSignal) => list<TrainingSchedule>(API_ENDPOINTS.TRAINING.SCHEDULES, params, signal),
  async getMaterial(id: string) {
    return unwrapData<TrainingMaterial>((await apiClient.get(API_ENDPOINTS.TRAINING.MATERIAL(id))).data);
  },
  async getSchedule(id: string) {
    return unwrapData<TrainingSchedule>((await apiClient.get(API_ENDPOINTS.TRAINING.SCHEDULE(id))).data);
  },
  async createMaterial(payload: CreateMaterialRequest) {
    return unwrapData<TrainingMaterial>((await apiClient.post(API_ENDPOINTS.TRAINING.MATERIALS, payload)).data);
  },
  async updateMaterial(id: string, payload: UpdateMaterialRequest) {
    // Backend v1.11.7 and mobile use PUT with the complete editable fields.
    return unwrapData<TrainingMaterial>((await apiClient.put(API_ENDPOINTS.TRAINING.MATERIAL(id), payload)).data);
  },
  async archiveMaterial(id: string) {
    await apiClient.delete(API_ENDPOINTS.TRAINING.MATERIAL(id));
  },
  async markRead(id: string) {
    return unwrapData<{ read_at: string }>((await apiClient.post(API_ENDPOINTS.TRAINING.MATERIAL_READ(id))).data).read_at;
  },
  async getContent(id: string) {
    return unwrapData<TrainingContent>((await apiClient.get(API_ENDPOINTS.TRAINING.MATERIAL_CONTENT(id))).data);
  },
  async uploadDocument(file: File) {
    const form = new FormData();
    form.append('file', file);
    return unwrapData<TrainingDocument>((await apiClient.post(API_ENDPOINTS.DOCUMENTS.UPLOAD, form, {
      headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000,
    })).data);
  },
  async createSchedule(payload: CreateScheduleRequest) {
    return unwrapData<TrainingSchedule>((await apiClient.post(API_ENDPOINTS.TRAINING.SCHEDULES, payload)).data);
  },
  async updateSchedule(id: string, payload: UpdateScheduleRequest) {
    return unwrapData<TrainingSchedule>((await apiClient.put(API_ENDPOINTS.TRAINING.SCHEDULE(id), payload)).data);
  },
  async archiveSchedule(id: string) {
    await apiClient.delete(API_ENDPOINTS.TRAINING.SCHEDULE(id));
  },
  async getAllGroups(orgId: string, signal?: AbortSignal) {
    const groups: TrainingGroup[] = [];
    // Requests above 100 silently fall back to 20 in the backend. Walk every
    // page so the picker also includes dealers beyond the first page.
    for (let page = 1; ; page++) {
      const result = await list<TrainingGroup>(API_ENDPOINTS.GROUPS.LIST, { page, limit: 100 }, signal);
      groups.push(...result.items);
      if (groups.length >= result.meta.total || result.items.length === 0) break;
    }
    return [...new Map(groups.filter(g => g.org_id === orgId && g.status === 'active').map(g => [g.id, g])).values()]
      .sort((a, b) => a.name.localeCompare(b.name));
  },
};
