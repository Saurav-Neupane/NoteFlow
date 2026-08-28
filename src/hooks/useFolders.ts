import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as folderService from '@/services/folder.service';
import { toPublicMessage } from '@/utils/errors';
import { noteKeys } from './useNotes';

export const folderKeys = {
  all: ['folders'] as const,
  list: (userId?: string) => [...folderKeys.all, 'list', userId ?? ''] as const,
};

export function useFolders(userId?: string) {
  return useQuery({
    queryKey: folderKeys.list(userId),
    queryFn: () => (userId ? folderService.fetchFolders(userId) : []),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

function fail(action: string) {
  return (error: unknown) => toast.error(`${action} failed: ${toPublicMessage(error)}`);
}

export function useFolderMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: folderKeys.all });
    // Deleting/moving folders re-files notes, so their lists must refresh too.
    qc.invalidateQueries({ queryKey: noteKeys.all });
  };

  const create = useMutation({
    mutationFn: (input: { userId: string } & Parameters<typeof folderService.createFolder>[1]) =>
      folderService.createFolder(input.userId, {
        name: input.name,
        color: input.color,
        parent_id: input.parent_id,
      }),
    onError: fail('Creating folder'),
    onSettled: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof folderService.updateFolder>[1];
    }) => folderService.updateFolder(id, patch),
    onError: fail('Updating folder'),
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => folderService.deleteFolder(id),
    onError: fail('Deleting folder'),
    onSettled: invalidate,
  });

  return { create, update, remove, invalidate };
}