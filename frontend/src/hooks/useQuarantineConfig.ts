import { useEffect, useState } from 'react';
import {
  fetchQuarantineConfig,
  type QuarantineConfigResult,
} from '@/api/quarantineConfig';

type QuarantineConfigHookState = {
  loading: boolean;
  data: QuarantineConfigResult | null;
};

export function useQuarantineConfig(): QuarantineConfigHookState {
  const [state, setState] = useState<QuarantineConfigHookState>({
    loading: true,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const data = await fetchQuarantineConfig();
      if (!cancelled) {
        setState({
          loading: false,
          data,
        });
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
