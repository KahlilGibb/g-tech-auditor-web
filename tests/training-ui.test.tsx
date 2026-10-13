import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '../src/i18n';
import TrainingPage from '../src/pages/TrainingPage';
import { MaterialEditor } from '../src/components/training/MaterialEditor';
import { ScheduleEditor } from '../src/components/training/ScheduleEditor';
import { trainingService } from '../src/services/trainingService';
import type { AuthUser } from '../src/types/auth';
import type { TrainingMaterial, TrainingSchedule } from '../src/types/training';

const auth = vi.hoisted(() => ({ user: { id: 'user', name: 'Admin', email: 'test@example.test', role: 'platform_admin', orgId: 'org-a' } as AuthUser }));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('../src/lib/appSwal', () => ({ appSwal: { success: vi.fn(), error: vi.fn(), confirm: vi.fn().mockResolvedValue(true) } }));
vi.mock('../src/services/trainingService', () => ({ trainingService: {
  getMaterials: vi.fn(), getSchedules: vi.fn(), getAllGroups: vi.fn(),
  createMaterial: vi.fn(), updateMaterial: vi.fn(), archiveMaterial: vi.fn(),
  createSchedule: vi.fn(), updateSchedule: vi.fn(), archiveSchedule: vi.fn(),
  uploadDocument: vi.fn(), getContent: vi.fn(), markRead: vi.fn(),
} }));

const material: TrainingMaterial = { id: 'm1', org_id: 'org-a', title: 'SOP Dealer', description: 'Panduan inspeksi', category: 'sop', document_id: 'd1', document_name: 'panduan.pdf', required: true, audience_type: 'selected_dealers', status: 'published', created_by_id: 'admin', assignee_group_ids: ['g1'], assignee_group_count: 1, read_count: 3, created_at: '2026-10-13T02:00:00Z', updated_at: '2026-10-13T02:00:00Z' };
const schedule: TrainingSchedule = { id: 's1', org_id: 'org-a', title: 'Training nasional', description: '', starts_at: '2026-10-13T02:00:00Z', ends_at: '2026-10-13T03:00:00Z', trainer: 'Trainer', location: 'Online', meeting_url: 'https://example.test/meeting', audience_type: 'all_dealers', status: 'published', created_by_id: 'admin', assignee_group_ids: [], assignee_group_count: 100, created_at: '', updated_at: '' };

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('id');
  auth.user = { id: 'user', name: 'Admin', email: 'test@example.test', role: 'platform_admin', orgId: 'org-a' };
  vi.mocked(trainingService.getMaterials).mockResolvedValue({ items: [material], meta: { total: 1, page: 1, limit: 20 } });
  vi.mocked(trainingService.getSchedules).mockResolvedValue({ items: [schedule], meta: { total: 1, page: 1, limit: 20 } });
  vi.mocked(trainingService.getAllGroups).mockResolvedValue([{ id: 'g1', name: 'Dealer BSD', code: 'BSD', status: 'active', org_id: 'org-a' }]);
  vi.mocked(trainingService.markRead).mockResolvedValue('2026-10-13T02:30:00Z');
});

describe('Training role flows', () => {
  it('shows admin CRUD, server read/assignee counts, and archive action', async () => {
    render(<TrainingPage />);
    await screen.findByText('SOP Dealer');
    expect(screen.getByText('3 pembaca')).toBeTruthy();
    expect(screen.getByText(/1 dealer · Dealer tertentu/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Arsipkan: SOP Dealer' }));
    await waitFor(() => expect(trainingService.archiveMaterial).toHaveBeenCalledWith('m1'));
  });
  it('dealer has no CRUD, status filter, dealer picker, or group fetch and can persist reading', async () => {
    auth.user = { ...auth.user, role: 'inspector', groupId: 'g1', permissions: [] };
    render(<TrainingPage />);
    await screen.findByText('SOP Dealer');
    expect(screen.queryByRole('button', { name: 'Tambah Materi' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit: SOP Dealer' })).toBeNull();
    expect(screen.queryByLabelText('Status')).toBeNull();
    expect(trainingService.getAllGroups).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Lihat detail' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tandai sudah dibaca' }));
    await waitFor(() => expect(trainingService.markRead).toHaveBeenCalledWith('m1'));
    await screen.findByRole('status');
    expect(screen.queryByRole('button', { name: 'Tandai sudah dibaca' })).toBeNull();
  });
  it('opens a protected presigned URL and only marks read after content succeeds', async () => {
    const popup = { opener: null, closed: false, close: vi.fn(), location: { replace: vi.fn() } };
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    vi.mocked(trainingService.getContent).mockResolvedValue({ url: 'https://example.test/signed?sig=123' });
    render(<TrainingPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Lihat detail' }));
    await userEvent.click(screen.getByRole('button', { name: 'Buka materi' }));
    await waitFor(() => expect(popup.location.replace).toHaveBeenCalledWith('https://example.test/signed?sig=123'));
    expect(trainingService.getContent).toHaveBeenCalledWith('m1');
    await waitFor(() => expect(trainingService.markRead).toHaveBeenCalledWith('m1'));
    vi.restoreAllMocks();
  });
  it('keeps unread status on content failure and closes the blank popup', async () => {
    const popup = { opener: null, closed: false, close: vi.fn(), location: { replace: vi.fn() } };
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    vi.mocked(trainingService.getContent).mockRejectedValueOnce(new Error('Content denied'));
    render(<TrainingPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Lihat detail' }));
    await userEvent.click(screen.getByRole('button', { name: 'Buka materi' }));
    await screen.findByText('Content denied');
    expect(trainingService.markRead).not.toHaveBeenCalled();
    expect(popup.close).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
  it('shows a retry state for API failures then empty state', async () => {
    vi.mocked(trainingService.getMaterials).mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ items: [], meta: { total: 0, page: 1, limit: 20 } });
    render(<TrainingPage />);
    await screen.findByText(/Training gagal dimuat: Offline/);
    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    await screen.findByText('Belum ada materi');
  });
  it('requests page 2 then resets to page 1 for a server-side category filter', async () => {
    vi.mocked(trainingService.getMaterials).mockResolvedValue({ items: [material], meta: { total: 41, page: 1, limit: 20 } });
    render(<TrainingPage />);
    await screen.findByText('41 hasil');
    await userEvent.click(screen.getByRole('button', { name: 'Berikutnya' }));
    await waitFor(() => expect(trainingService.getMaterials).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, limit: 20 }), expect.any(AbortSignal)));
    await userEvent.selectOptions(screen.getByLabelText('Kategori'), 'pdf');
    await waitFor(() => expect(trainingService.getMaterials).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, category: 'pdf' }), expect.any(AbortSignal)));
  });
  it('requires an organization before reading or creating training', () => {
    auth.user = { ...auth.user, orgId: undefined };
    render(<TrainingPage />);
    expect(screen.getByText(/Akun belum terhubung/)).toBeTruthy();
    expect(trainingService.getMaterials).not.toHaveBeenCalled();
  });
  it('debounces search and passes the keyword to the server', async () => {
    render(<TrainingPage />);
    await screen.findByText('SOP Dealer');
    await userEvent.type(screen.getByPlaceholderText('Cari judul atau deskripsi materi…'), 'manual');
    await waitFor(() => expect(trainingService.getMaterials).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'manual', page: 1 }), expect.any(AbortSignal)));
  });
  it('does not show a late response from a previous organization', async () => {
    let finishOld: (value: Awaited<ReturnType<typeof trainingService.getMaterials>>) => void = () => {};
    vi.mocked(trainingService.getMaterials).mockReturnValueOnce(new Promise(resolve => { finishOld = resolve; }));
    const view = render(<TrainingPage />);
    auth.user = { ...auth.user, id: 'other-user', orgId: 'org-b' };
    vi.mocked(trainingService.getMaterials).mockResolvedValue({ items: [{ ...material, id: 'm2', org_id: 'org-b', title: 'Organization B material' }], meta: { total: 1, page: 1, limit: 20 } });
    view.rerender(<TrainingPage />);
    await screen.findByText('Organization B material');
    finishOld({ items: [material], meta: { total: 1, page: 1, limit: 20 } });
    await waitFor(() => expect(screen.queryByText('SOP Dealer')).toBeNull());
  });
});

describe('Training editors', () => {
  it('uploads once, reuses the document on save retry, and publishes selected-dealer material', async () => {
    const onSaved = vi.fn();
    vi.mocked(trainingService.uploadDocument).mockResolvedValue({ id: 'uploaded', name: 'audit.pdf', file_type: 'application/pdf' });
    vi.mocked(trainingService.createMaterial).mockRejectedValueOnce(new Error('Save failed')).mockResolvedValue(material);
    render(<MaterialEditor item={null} orgId="org-a" onClose={vi.fn()} onSaved={onSaved} />);
    await userEvent.type(screen.getByLabelText(/^Judul/), 'Panduan baru');
    await userEvent.upload(screen.getByLabelText('Pilih dokumen'), new File(['pdf'], 'audit.pdf', { type: 'application/pdf' }));
    await userEvent.selectOptions(screen.getByLabelText('Ditugaskan kepada'), 'selected_dealers');
    await userEvent.click(await screen.findByLabelText(/Dealer BSD/));
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'published');
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await screen.findByText('Save failed');
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(trainingService.uploadDocument).toHaveBeenCalledOnce();
    expect(trainingService.createMaterial).toHaveBeenLastCalledWith(expect.objectContaining({ document_id: 'uploaded', external_url: '', assignee_group_ids: ['g1'], audience_type: 'selected_dealers', publish: true }));
  });
  it('clears a previous document reference when editing to an external URL', async () => {
    render(<MaterialEditor item={material} orgId="org-a" onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText('Sumber materi'), 'external');
    await userEvent.type(screen.getByLabelText(/^URL materi/), 'https://example.test/manual');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    await waitFor(() => expect(trainingService.updateMaterial).toHaveBeenCalledWith('m1', expect.objectContaining({ document_id: null, external_url: 'https://example.test/manual', status: 'published' })));
  });
  it('rejects empty assignees before sending a mutation', async () => {
    render(<MaterialEditor item={material} orgId="org-a" onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Kosongkan pilihan' }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    await screen.findByText('Pilih minimal satu dealer.');
    expect(trainingService.updateMaterial).not.toHaveBeenCalled();
  });
  it('preserves WIB start/end and supports cancellation without losing schedule fields', async () => {
    render(<ScheduleEditor item={schedule} orgId="org-a" onClose={vi.fn()} onSaved={vi.fn()} />);
    expect((screen.getByLabelText(/^Mulai \(WIB\)/) as HTMLInputElement).value).toBe('2026-10-13T09:00');
    expect((screen.getByLabelText('Selesai (WIB, opsional)') as HTMLInputElement).value).toBe('2026-10-13T10:00');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'cancelled');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    await waitFor(() => expect(trainingService.updateSchedule).toHaveBeenCalledWith('s1', expect.objectContaining({ starts_at: '2026-10-13T02:00:00.000Z', ends_at: '2026-10-13T03:00:00.000Z', status: 'cancelled', assignee_group_ids: [], meeting_url: 'https://example.test/meeting' })));
  });
  it('rejects an end before start even when form submission bypasses native validation', async () => {
    render(<ScheduleEditor item={schedule} orgId="org-a" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Selesai (WIB, opsional)'), { target: { value: '2026-10-13T08:00' } });
    fireEvent.submit(within(screen.getByRole('dialog')).getByLabelText(/^Judul/).closest('form')!);
    await screen.findByText('Tanggal selesai harus sama atau setelah tanggal mulai.');
    expect(trainingService.updateSchedule).not.toHaveBeenCalled();
  });
  it('publishes a new schedule with an optional null end and all dealers', async () => {
    render(<ScheduleEditor item={null} orgId="org-a" onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/^Judul/), 'Training baru');
    fireEvent.change(screen.getByLabelText(/^Mulai/), { target: { value: '2026-10-20T09:00' } });
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'published');
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(trainingService.createSchedule).toHaveBeenCalledWith(expect.objectContaining({ starts_at: '2026-10-20T02:00:00.000Z', ends_at: null, audience_type: 'all_dealers', assignee_group_ids: [], publish: true })));
  });
});
