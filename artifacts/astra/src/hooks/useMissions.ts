import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(text);
  }
  return res.json();
}

export function useMissions() {
  return useQuery({
    queryKey: ["missions", "today"],
    queryFn: () => apiFetch("/missions"),
    retry: 1,
  });
}

export function useCompleteMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slot: string) =>
      apiFetch("/missions/complete", {
        method: "POST",
        body: JSON.stringify({ slot }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["missions"] }),
  });
}

export function useAlignment() {
  return useQuery({
    queryKey: ["missions", "alignment"],
    queryFn: () => apiFetch("/missions/alignment"),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useMilestones() {
  return useQuery({
    queryKey: ["missions", "milestones"],
    queryFn: () => apiFetch("/missions/milestones"),
    retry: 1,
  });
}

export function useRegret() {
  return useQuery({
    queryKey: ["missions", "regret"],
    queryFn: () => apiFetch("/missions/regret"),
    retry: 1,
  });
}
