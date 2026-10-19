// apps/web/src/shared/api/ai.js
//
// React Query hooks for Mave AI BYOK settings.
//
// The server exposes an ARRAY of credentials (one per saved provider).
// `useAiSettings` returns that array; the panel renders one card per entry.

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
  return data.credentials || [];
}

export async function saveSettings(payload) {
  return apiJson('/api/ai/settings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteSettings(provider) {
  return apiJson(`/api/ai/settings/${encodeURIComponent(provider)}`, {
    method: 'DELETE',
  });
}

export async function updateModels(provider, models) {
  return apiJson(`/api/ai/settings/${encodeURIComponent(provider)}/models`, {
    method: 'PATCH',
    body: JSON.stringify({ models }),
  });
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
    staleTime: Infinity,
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
    mutationFn: (provider) => deleteSettings(provider),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiKeys.settings() });
    },
  });
}

export function useUpdateAiModels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, models }) => updateModels(provider, models),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiKeys.settings() });
    },
  });
}