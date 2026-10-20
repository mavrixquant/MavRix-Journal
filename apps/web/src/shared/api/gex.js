
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiJson } from './client.js';
import { useSSEFallback } from './sse.js';


export const gexKeys = {
  all: ['gex'],
  days: () => ['gex', 'days'],
  day: (date) => ['gex', 'day', date],
  adminDays: () => ['gex', 'admin', 'days'],
};



export async function getGexDays() {
  const data = await apiJson('/api/gex');
  return data.days;
}

export async function getGexDay(date) {
  const data = await apiJson(`/api/gex/${encodeURIComponent(date)}`);
  return data.day;
}


export async function getAdminGexDays() {
  const data = await apiJson('/api/admin/gex');
  return data.days;
}

export async function upsertAdminGex({
  date,
  levels,
  converted,
  sourceTimezone,
  overwrite = false,
}) {
  const qs = overwrite ? '?overwrite=true' : '';
  const data = await apiJson(`/api/admin/gex${qs}`, {
    method: 'POST',
    body: JSON.stringify({ date, levels, converted, sourceTimezone }),
  });
  return data.day;
}

export async function deleteAdminGex(date) {
  return apiJson(`/api/admin/gex/${encodeURIComponent(date)}`, {
    method: 'DELETE',
  });
}


const FIVE_MIN = 5 * 60_000;
const THIRTY_SEC = 30_000;

export function useGexDays() {
  const sseFallback = useSSEFallback();
  return useQuery({
    queryKey: gexKeys.days(),
    queryFn: getGexDays,
    staleTime: FIVE_MIN,
    refetchInterval: sseFallback ? 60_000 : false,
  });
}

export function useGexDay(date) {
  return useQuery({
    queryKey: gexKeys.day(date),
    queryFn: () => getGexDay(date),
    enabled: !!date,
    staleTime: FIVE_MIN,
  });
}


export function useAdminGexDays() {
  return useQuery({
    queryKey: gexKeys.adminDays(),
    queryFn: getAdminGexDays,
    staleTime: THIRTY_SEC,
  });
}

export function useAdminUpsertGex() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertAdminGex,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gexKeys.all });
    },
  });
}

export function useAdminDeleteGex() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date) => deleteAdminGex(date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gexKeys.all });
    },
  });
}