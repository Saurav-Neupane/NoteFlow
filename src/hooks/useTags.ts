import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as tagService from '@/services/tag.service';
import { toPublicMessage } from '@/utils/errors';
import { noteKeys } from './useNotes';

export const tagKeys = {
  all: ['tags'] as const,
  list: (userId?: string) => [...tagKeys.all, 'list', userId ?? ''] as const,
  usage: (userId?: string) => [...tagKeys.all, 'usage', userId ?? ''] as const,
};

export function useTags(userId?: string) {
  return useQuery({
    queryKey: tagKeys.list(userId),
    queryFn: () => (userId ? tagService.fetchTags(userId) : []),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

/** Note counts per tag for the tags page. */
export function useTagUsage(userId?: string) {
  return useQuery<Record<string, number>>({
    queryKey: tagKeys.usage(userId),
    queryFn: () => (userId ? tagService.fetchTagUsageMap(userId) : {}),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

function fail(action: string) {
  return (error: unknown) => toast.error(`${action} failed: ${toPublicMessage(error)}`);
}

export function useTagMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: tagKeys.all });
    // Notes carry tag ids inline, so their hydrated tag lists must refresh too.
    qc.invalidateQueries({ queryKey: noteKeys.all });
  };

  const create = useMutation({
    mutationFn: (input: { userId: string; name: string; color: string }) =>
      tagService.createTag(input.userId, { name: input.name, color: input.color }),
    onError: fail('Creating tag'),
    onSettled: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name?: string; color?: string } }) =>
      tagService.updateTag(id, patch),
    onError: fail('Updating tag'),
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => tagService.deleteTag(id),
    onError: fail('Deleting tag'),
    onSettled: invalidate,
  });

  return { create, update, remove, invalidate };
}
