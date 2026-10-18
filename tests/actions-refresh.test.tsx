import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actionService } from '../src/services/actionService';
import { useActions } from '../src/hooks/useActions';
import { useActionStore } from '../src/stores/actionStore';
import type { ActionItem } from '../src/types/action';

vi.mock('../src/services/actionService', () => ({ actionService: { getActions: vi.fn(), getWorkflowStatuses: vi.fn() } }));
const fixture: ActionItem = { id: 'qa', code: 'qa', title: 'Finding', source: '', assignee: '', dueDate: '', priority: 'Medium', workflowStatusId: 'open', contentItems: [], timeline: [], createdAt: '' };
let visible = 'visible', online = true;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-18T00:00:00Z')); vi.clearAllMocks();
  visible = 'visible'; online = true;
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible as DocumentVisibilityState);
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
  useActionStore.setState({ actions: [], isFetched: false, lastFetchedAt: 0, lastFetchAttemptAt: 0, isLoading: false, isSaving: false, error: null });
  vi.mocked(actionService.getActions).mockResolvedValue([fixture]);
  vi.mocked(actionService.getWorkflowStatuses).mockResolvedValue([]);
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
const settle = () => act(async () => { await Promise.resolve(); });

describe('Lightweight Actions refresh', () => {
  it('refreshes every 30 seconds without hiding existing data; cleans up on unmount', async () => {
    const { result, unmount } = renderHook(() => useActions()); await settle();
    expect(actionService.getActions).toHaveBeenCalledTimes(1);
    expect(result.current.actions).toHaveLength(1);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(actionService.getActions).toHaveBeenCalledTimes(2);
    expect(result.current.isLoading).toBe(false);
    unmount(); expect(vi.getTimerCount()).toBe(0);
  });
  it('does no reads while hidden or offline and resumes when online/visible', async () => {
    visible = 'hidden';
    const { unmount } = renderHook(() => useActions()); await settle();
    expect(actionService.getActions).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
    visible = 'visible'; act(() => document.dispatchEvent(new Event('visibilitychange'))); await settle();
    expect(actionService.getActions).toHaveBeenCalledTimes(1);
    online = false; act(() => window.dispatchEvent(new Event('offline')));
    expect(vi.getTimerCount()).toBe(0);
    await act(() => vi.advanceTimersByTimeAsync(90_000)); expect(actionService.getActions).toHaveBeenCalledTimes(1);
    online = true; act(() => window.dispatchEvent(new Event('online'))); await settle();
    expect(actionService.getActions).toHaveBeenCalledTimes(2); unmount();
  });
  it('deduplicates pending reads and throttles focus/visibility bursts', async () => {
    let finish!: (actions: ActionItem[]) => void;
    vi.mocked(actionService.getActions).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { unmount } = renderHook(() => useActions());
    act(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    expect(actionService.getActions).toHaveBeenCalledTimes(1);
    await act(async () => { finish([fixture]); });
    act(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); }); await settle();
    expect(actionService.getActions).toHaveBeenCalledTimes(1); unmount();
  });
  it('skips automatic reads during saving and retains existing data on read failure', async () => {
    const { result, unmount } = renderHook(() => useActions()); await settle();
    act(() => useActionStore.setState({ isSaving: true }));
    await act(() => vi.advanceTimersByTimeAsync(30_000)); expect(actionService.getActions).toHaveBeenCalledTimes(1);
    act(() => useActionStore.setState({ isSaving: false }));
    vi.mocked(actionService.getActions).mockRejectedValueOnce(new Error('offline fixture'));
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(result.current.actions).toHaveLength(1); expect(result.current.error).toContain('offline fixture'); expect(result.current.isLoading).toBe(false); unmount();
  });
  it('never overwrites a local save with an older pending refresh response', async () => {
    let finish!: (actions: ActionItem[]) => void;
    vi.mocked(actionService.getActions).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { result, unmount } = renderHook(() => useActions());
    act(() => useActionStore.setState({ actions: [{ ...fixture, title: 'Server-confirmed local edit' }], isFetched: true }));
    await act(async () => { finish([fixture]); });
    expect(result.current.actions[0].title).toBe('Server-confirmed local edit'); unmount();
  });
  it('also throttles focus bursts after a failed read', async () => {
    vi.mocked(actionService.getActions).mockRejectedValueOnce(new Error('network failed'));
    const { unmount } = renderHook(() => useActions()); await settle();
    act(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); }); await settle();
    expect(actionService.getActions).toHaveBeenCalledTimes(1); unmount();
  });
});
