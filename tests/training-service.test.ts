import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/lib/apiClient';
import { trainingService } from '../src/services/trainingService';
import { fromWibInput, isTrainingAdmin, safeTrainingUrl, toWibInput } from '../src/utils/training';
import { webRouteFor } from '../src/services/notificationService';
import { hasPermission, NAV_PERMISSIONS } from '../src/constants/rbac';

vi.mock('../src/lib/apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());

describe('Training API contract', () => {
  it('keeps server total and sends paginated search/category/status', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [{ id: 'm21' }], meta: { total: 42, page: 2, limit: 20 } } } as never);
    const query = { page: 2, limit: 20, search: 'audit', category: 'sop' as const, status: 'draft' as const };
    expect(await trainingService.getMaterials(query)).toEqual({ items: [{ id: 'm21' }], meta: { total: 42, page: 2, limit: 20 } });
    expect(apiClient.get).toHaveBeenCalledWith('/training/materials', { params: query, signal: undefined });
  });
  it('walks all dealer pages and excludes inactive/foreign organization groups', async () => {
    const firstPage = Array.from({ length: 100 }, (_, n) => ({ id: `g${n}`, org_id: 'org-a', name: `Dealer ${n}`, code: '', status: 'active' }));
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { data: firstPage, meta: { total: 104, page: 1, limit: 100 } } } as never)
      .mockResolvedValueOnce({ data: { data: [
        { id: 'g100', org_id: 'org-a', name: 'Dealer last', status: 'active' },
        { id: 'g101', org_id: 'org-b', name: 'Foreign', status: 'active' },
        { id: 'g102', org_id: 'org-a', name: 'Inactive', status: 'inactive' },
        { ...firstPage[0] },
      ], meta: { total: 104, page: 2, limit: 100 } } } as never);
    const groups = await trainingService.getAllGroups('org-a');
    expect(groups).toHaveLength(101);
    expect(groups.some(g => g.id === 'g100')).toBe(true);
    expect(groups.some(g => g.id === 'g101' || g.id === 'g102')).toBe(false);
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/groups', { params: { page: 2, limit: 100 }, signal: undefined });
  });
  it('uses PUT for updates and DELETE for archive, never PATCH', async () => {
    const fields = { title: 'Audit', description: '', category: 'pdf' as const, document_id: 'doc-id', external_url: '', required: true, audience_type: 'selected_dealers' as const, assignee_group_ids: ['group-id'], status: 'published' as const };
    vi.mocked(apiClient.put).mockResolvedValue({ data: { data: { id: 'material-id', ...fields } } } as never);
    await trainingService.updateMaterial('material-id', fields);
    await trainingService.archiveMaterial('material-id');
    expect(apiClient.put).toHaveBeenCalledWith('/training/materials/material-id', fields);
    expect(apiClient.delete).toHaveBeenCalledWith('/training/materials/material-id');
  });
  it('uploads multipart documents and opens content via the protected endpoint', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { id: 'doc-id', name: 'manual.pdf' } } } as never);
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: { url: 'https://storage.example.test/signed?expires=123' } } } as never);
    const file = new File(['pdf'], 'manual.pdf', { type: 'application/pdf' });
    expect((await trainingService.uploadDocument(file)).id).toBe('doc-id');
    const call = vi.mocked(apiClient.post).mock.calls[0];
    expect(call[0]).toBe('/documents/upload');
    expect((call[1] as FormData).get('file')).toBe(file);
    expect((await trainingService.getContent('material-id')).url).toContain('signed');
    expect(apiClient.get).toHaveBeenCalledWith('/training/materials/material-id/content');
  });
});

describe('Training boundaries', () => {
  it('matches the backend HO roles exactly', () => {
    ['platform_admin', 'org_admin', 'admin_ho'].forEach(role => expect(isTrainingAdmin(role)).toBe(true));
    ['inspector', 'dealer', 'admin', undefined].forEach(role => expect(isTrainingAdmin(role)).toBe(false));
  });
  it('rejects executable URLs, relative paths, and URLs with credentials', () => {
    ['javascript:alert(1)', 'data:text/html,hi', '/storage-key', 'https://user:secret@example.com'].forEach(url => expect(safeTrainingUrl(url)).toBeNull());
    expect(safeTrainingUrl('https://example.com/a?signature=x')).toBe('https://example.com/a?signature=x');
  });
  it('round-trips schedules in WIB independent of the machine timezone', () => {
    expect(fromWibInput('2026-10-13T09:00')).toBe('2026-10-13T02:00:00.000Z');
    expect(toWibInput('2026-10-13T02:00:00Z')).toBe('2026-10-13T09:00');
    expect(fromWibInput('')).toBeNull();
  });
  it('makes the dealer menu accessible without inventing training permissions', () => {
    expect(hasPermission([], NAV_PERMISSIONS.training)).toBe(true);
    expect(hasPermission([], NAV_PERMISSIONS.users)).toBe(false);
  });
  it('maps published Training notifications from mobile routes to the web', () => {
    expect(webRouteFor({ type: 'training_published', data: { route: '/(app)/(tabs)/training' } })).toBe('/training');
    expect(webRouteFor({ type: 'training_published' })).toBe('/training');
  });
});
