/**
 * Local React Query hooks for /api/missions endpoints.
 * Written locally because the missions routes aren't in the generated API client.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';

export type MissionsData = {
  id: number;
  userId: number;
  date: string;
  criticalMission: string | null;
  secondaryMission1: string | null;
  secondaryMission2: string | null;
  secondaryMission3: string | null;
  courageChallenge: string | null;
  criticalCompleted: boolean;
  secondary1Completed: boolean;
  secondary2Completed: boolean;
  secondary3Completed: boolean;
  courageCompleted: boolean;
};

export type MissionSlot = 'critical' | 'secondary1' | 'secondary2' | 'secondary3' | 'courage';

export const MISSIONS_QUERY_KEY = ['missions'] as const;

export function useGetMissions() {
  return useQuery<MissionsData>({
    queryKey: MISSIONS_QUERY_KEY,
    queryFn: () => customFetch<MissionsData>('/api/missions'),
    retry: 1,
  });
}

export function useCompleteMission() {
  const queryClient = useQueryClient();
  return useMutation<MissionsData, Error, { slot: MissionSlot }>({
    mutationFn: ({ slot }) =>
      customFetch<MissionsData>('/api/missions/complete', {
        method: 'POST',
        body: JSON.stringify({ slot }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MISSIONS_QUERY_KEY });
    },
  });
}
