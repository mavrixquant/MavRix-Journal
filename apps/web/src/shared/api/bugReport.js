import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiJson } from './client';

export const bugReportKeys = {
  all: ['bug-reports'],
  admin: (filters) => ['admin', 'bug-reports', filters || {}],
};

/* ------------------------ user ------------------------ */

export async function submitBugReport(payload) {
  const data = await apiJson('/api/bug-reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.report;
}

export function useSubmitBugReport() {
  return useMutation({ mutationFn: submitBugReport });
}

/* ------------------------ admin ------------------------ */

function buildQS(filters) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters || {})) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function fetchAdminBugReports(filters = {}) {
  return apiJson(`/api/admin/bug-reports${buildQS(filters)}`);
}

export async function updateAdminBugReport(id, patch) {
  const data = await apiJson(
    `/api/admin/bug-reports/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }
  );
  return data.report;
}

export async function deleteAdminBugReport(id) {
  return apiJson(
    `/api/admin/bug-reports/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
}

export function useAdminBugReports(filters = {}) {
  return useQuery({
    queryKey: bugReportKeys.admin(filters),
    queryFn: () => fetchAdminBugReports(filters),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });
}

export function useUpdateAdminBugReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => updateAdminBugReport(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bug-reports'] });
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}

export function useDeleteAdminBugReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteAdminBugReport(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bug-reports'] });
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}