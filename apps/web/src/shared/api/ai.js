// apps/web/src/shared/api/ai.js
//
// React Query hooks for Mave AI BYOK settings.

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiJson } from './client';

export const aiKeys = {
  all: ['ai'],
  providers: () => ['ai', 'providers'],
  settings: () => ['ai', 'settings'],
};

/* ------------------------------------------------------------------ */
/*  Raw fetchers                                                       */
/* ------------------------------------------------------------------ */

export async function getProviders() {
  const data = await apiJson('/api/ai/providers');
  return data.providers;
}

export async function getSettings() {
  const data = await apiJson('/api/ai/settings');
  return data.credential;
}

export async function saveSettings(payload) {
  const data = await apiJson('/api/ai/settings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.credential;
}

export async function deleteSettings() {
  return apiJson('/api/ai/settings', { method: 'DELETE' });
}

export async function testKey(payload) {
  return apiJson('/api/ai/test', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

export function useAiProviders() {
  return useQuery({
    queryKey: aiKeys.providers(),
    queryFn: getProviders,
    staleTime: Infinity, // Static list
  });
}

export function useAiSettings() {
  return useQuery({
    queryKey: aiKeys.settings(),
    queryFn: getSettings,
    staleTime: 60_000,
  });
}

export function useTestAiKey() {
  return useMutation({
    mutationFn: testKey,
  });
}

export function useSaveAiCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiKeys.settings() });
    },
  });
}

export function useDeleteAiCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiKeys.settings() });
    },
  });
}