import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiRequestError } from '../src/lib/apiClient';
import { actionService } from '../src/services/actionService';
import { inspectionService } from '../src/services/inspectionService';
import { useActionStore } from '../src/stores/actionStore';
import { reportFilename } from '../src/utils/reportFilename';

vi.mock('../src/lib/apiClient', () => ({
  apiClient: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() },
  MockInterceptError: class extends Error {},
  ApiRequestError: class extends Error { constructor(message: string, public status?: number) { super(message); } },
}));
beforeEach(() => { vi.clearAllMocks(); useActionStore.setState({ actions: [], isFetched: false, isSaving: false, error: null }); });
const revision = '2026-10-17T03:00:00.123456Z';
const freshRevision = '2026-10-17T03:01:00.654321Z';
const raw = { id: 'qa', title: 'Finding', priority: 'medium', status_id: 'open', updated_at: revision };
const input = { title: 'HO edit', priority: 'Medium' as const, workflowStatusId: 'open', expectedUpdatedAt: revision };

describe('Action revision contract', () => {
  it('preserves microseconds and sends the edit-time revision, not a fresh fetch revision', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: { ...raw, updated_at: freshRevision } } } as never);
    vi.mocked(apiClient.put).mockResolvedValue({ data: { data: raw } } as never);
    const saved = await actionService.updateAction('qa', input);
    expect(saved.updatedAt).toBe(freshRevision);
    expect(apiClient.put).toHaveBeenCalledWith('/actions/qa', expect.objectContaining({ expected_updated_at: revision }));
  });
  it('does not modify assignees or retry a conflicting edit', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: { ...raw, assignees: [{ user_id: 'dealer' }] } } } as never);
    vi.mocked(apiClient.put).mockRejectedValue(new ApiRequestError('Action sudah berubah', 409));
    await expect(actionService.updateAction('qa', { ...input, assigneeIds: [] })).rejects.toMatchObject({ status: 409 });
    expect(apiClient.put).toHaveBeenCalledTimes(1);
    expect(apiClient.post).not.toHaveBeenCalled(); expect(apiClient.delete).not.toHaveBeenCalled();
  });
  it('sends the revision with a status change', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { data: raw } } as never);
    await actionService.updateActionStatus('qa', 'done', revision);
    expect(apiClient.put).toHaveBeenCalledWith('/actions/qa', { status_id: 'done', expected_updated_at: revision });
  });
  it('reloads list data on conflict and never retries the stale form', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => ({ data: { data: url === '/actions/qa' ? raw : url === '/actions' ? [{ ...raw, status_id: 'done', updated_at: freshRevision, resolution_note: 'Dealer repair' }] : [] } }) as never);
    vi.mocked(apiClient.put).mockRejectedValue(new ApiRequestError('Action sudah berubah', 409));
    await expect(useActionStore.getState().updateAction('qa', input)).rejects.toMatchObject({ status: 409 });
    expect(useActionStore.getState().actions[0]).toMatchObject({ updatedAt: freshRevision, workflowStatusId: 'done', resolutionNote: 'Dealer repair' });
    expect(apiClient.put).toHaveBeenCalledTimes(1);
  });
});

describe('Report request budget', () => {
  it('uses the server dealer/date/time filename for both report kinds', async () => {
    const blob = new Blob(['PK fixture']);
    for (const kind of ['report', 'issues'] as const) {
      const name = `${kind === 'report' ? 'Inspection' : 'Report Temuan'} Dealer BSD 2026-10-18 10-20-30 WIB.xlsx`;
      vi.mocked(apiClient.get).mockResolvedValue({ data: blob, headers: { 'content-disposition': `attachment; filename="${name}"` } } as never);
      expect(await inspectionService.exportReportFile('qa', kind)).toEqual({ blob, filename: name });
    }
    expect(reportFilename("attachment; filename*=utf-8''Inspection%20Cabang%20%C3%89.xlsx", 'fallback')).toBe('Inspection Cabang É.xlsx');
    expect(reportFilename('attachment; filename="../../bad.xlsx"', 'fallback')).toBe('-..-bad.xlsx');
  });
  it('keeps blob downloads but allows report-specific time beyond JSON timeout', async () => {
    const blob = new Blob(['PK fixture']);
    vi.mocked(apiClient.get).mockResolvedValue({ data: blob } as never);
    expect(await inspectionService.exportReport('qa')).toBe(blob);
    expect(await inspectionService.exportIssues('qa')).toBe(blob);
    for (const call of vi.mocked(apiClient.get).mock.calls) expect(call[1]).toMatchObject({ responseType: 'blob', timeout: 120_000 });
  });
});
