
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiJson } from './client';
import { useSSEFallback } from './sse';


export const calendarKeys = {
  all: ['calendar'],
  events: (filters) => ['calendar', 'events', filters],
  currencies: () => ['calendar', 'currencies'],
  meta: () => ['calendar', 'meta'],
};


function buildEventsQuery({ from, to, currencies = [], impacts = [], limit }) {
  const params = new URLSearchParams();
  params.set('from', from);
  params.set('to', to);
  if (currencies.length > 0) params.set('currency', currencies.join(','));
  if (impacts.length > 0) params.set('impact', impacts.join(','));
  if (limit) params.set('limit', String(limit));
  return params.toString();
}

export async function getCalendarEvents({ from, to, currencies, impacts, limit }) {
  const qs = buildEventsQuery({ from, to, currencies, impacts, limit });
  const data = await apiJson(`/api/calendar?${qs}`);
  return data.events;
}

export async function getCalendarCurrencies() {
  const data = await apiJson('/api/calendar/currencies');
  return data.currencies;
}

export async function getCalendarMeta() {
  return apiJson('/api/calendar/meta');
}

export async function triggerCalendarSync() {
  return apiJson('/api/calendar/sync', { method: 'POST' });
}


const FIVE_MIN = 5 * 60_000;
const THIRTY_MIN = 30 * 60_000;

export function useCalendarEvents(
  { from, to, currencies = [], impacts = [], limit } = {},
  { enabled = true } = {}
) {
  const sseFallback = useSSEFallback();

  const refetchInterval = sseFallback ? 60_000 : false;

  const filterKey = {
    from: from || '',
    to: to || '',
    currencies: [...currencies].sort(),
    impacts: [...impacts].sort(),
    limit: limit || null,
  };

  return useQuery({
    queryKey: calendarKeys.events(filterKey),
    queryFn: () =>
      getCalendarEvents({ from, to, currencies, impacts, limit }),
    enabled: enabled && !!from && !!to,
    staleTime: FIVE_MIN,
    refetchInterval,
    placeholderData: (prev) => prev,
  });
}

export function useCalendarCurrencies({ enabled = true } = {}) {
  return useQuery({
    queryKey: calendarKeys.currencies(),
    queryFn: getCalendarCurrencies,
    enabled,
    staleTime: THIRTY_MIN,
  });
}

export function useCalendarMeta({ enabled = true } = {}) {
  return useQuery({
    queryKey: calendarKeys.meta(),
    queryFn: getCalendarMeta,
    enabled,
    staleTime: FIVE_MIN,
  });
}

export function useSyncCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: triggerCalendarSync,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}