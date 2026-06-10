import { useQuery, useMutation } from "@tanstack/react-query";
import { useGetMe, useGetUserStats } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(text);
  }
  return res.json();
}

export function useSubscription() {
  return useQuery({
    queryKey: ["stripe", "subscription"],
    queryFn: () => apiFetch("/stripe/subscription"),
    retry: 1,
    staleTime: 60_000,
  });
}

export function useStripeProducts() {
  return useQuery({
    queryKey: ["stripe", "products"],
    queryFn: () => apiFetch("/stripe/products"),
    staleTime: 5 * 60_000,
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (priceId: string) =>
      apiFetch("/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ priceId }),
      }),
  });
}

export function useCreatePortal() {
  return useMutation({
    mutationFn: () =>
      apiFetch("/stripe/portal", { method: "POST" }),
  });
}

export function useIsPro(): boolean {
  const { data } = useSubscription();
  return data?.isPro === true;
}

export function useIsPaywalled(): boolean {
  const { data: stats } = useGetUserStats();
  const isPro = useIsPro();
  if (isPro) return false;
  const joinedDaysAgo = stats?.joinedDaysAgo ?? 0;
  return joinedDaysAgo >= 5;
}
