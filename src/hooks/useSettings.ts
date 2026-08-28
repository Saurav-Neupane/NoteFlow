import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as settingsService from '@/services/settings.service';
import { useSettingsStore, useUIStore } from '@/stores';
import { toPublicMessage } from '@/utils/errors';
import type { UserSettings } from '@/types';

export const settingsKeys = {
  all: (userId?: string) => ['settings', userId ?? ''] as const,
};

/**
 * Loads server settings, then mirrors them into the settings store and applies
 * theme/accent/font to the DOM.
 *
 * The mirror + DOM writes run in an effect (not inside `queryFn`) so the query
 * function stays a pure fetch — re-running it for a refetch must not trigger
 * side effects, and React Query may call it in contexts where DOM mutation is
 * unexpected.
 */
export function useSettings(userId?: string) {
  const setAll = useSettingsStore((s) => s.setAll);
  const applySettings = useUIStore((s) => s.applySettings);

  const query = useQuery({
    queryKey: settingsKeys.all(userId),
    queryFn: () =>
      userId ? settingsService.fetchSettings(userId) : Promise.resolve(null),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  const settings = query.data;
  useEffect(() => {
    if (!settings) return;
    setAll(settings);
    applySettings(settings);
  }, [settings, setAll, applySettings]);

  return query;
}

export function useSaveSettings() {
  const qc = useQueryClient();
  const applySettings = useUIStore((s) => s.applySettings);
  return useMutation({
    mutationFn: ({ userId, settings }: { userId: string; settings: UserSettings }) =>
      settingsService.saveSettings(userId, settings),
    // Apply immediately so the UI reflects the change without waiting on a refetch.
    onMutate: ({ settings }) => applySettings(settings),
    onError: (error) => toast.error(`Saving settings failed: ${toPublicMessage(error)}`),
    onSettled: (_d, _e, { userId }) =>
      qc.invalidateQueries({ queryKey: settingsKeys.all(userId) }),
  });
}
