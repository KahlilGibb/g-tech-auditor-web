import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../lib/apiResponse';
import type { ListResult } from '../types/management';
import type { TrainingListQuery } from '../types/training';

export function useTrainingList<T>(
  load: (params: TrainingListQuery, signal?: AbortSignal) => Promise<ListResult<T>>,
  params: TrainingListQuery,
  scope: string,
  revision: number,
) {
  const [state, setState] = useState<{ key: string; result?: ListResult<T>; error?: string }>({ key: '' });
  const [retry, setRetry] = useState(0);
  const serialized = JSON.stringify(params);
  const key = `${scope}:${serialized}:${revision}:${retry}`;
  useEffect(() => {
    const controller = new AbortController();
    void load(JSON.parse(serialized) as TrainingListQuery, controller.signal).then(
      result => { if (!controller.signal.aborted) setState({ key, result }); },
      error => { if (!controller.signal.aborted) setState({ key, error: getApiErrorMessage(error) }); },
    );
    return () => controller.abort();
  }, [load, serialized, key]);
  return {
    items: state.key === key ? state.result?.items ?? [] : [],
    total: state.key === key ? state.result?.meta.total ?? 0 : 0,
    loading: state.key !== key,
    error: state.key === key ? state.error : undefined,
    refresh: () => setRetry(value => value + 1),
  };
}
