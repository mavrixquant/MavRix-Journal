import { useQuery } from '@tanstack/react-query';
import { apiJson } from './client';
import { APP_VERSION } from '@/generated/version';

export { APP_VERSION };

export const versionKeys = {
  version: () => ['version'],
  changelog: () => ['changelog'],
};

export function useVersion() {
  return useQuery({
    queryKey: versionKeys.version(),
    queryFn: () => apiJson('/api/version'),
    staleTime: 5 * 60_000,
  });
}

export function useChangelog() {
  return useQuery({
    queryKey: versionKeys.changelog(),
    queryFn: () => apiJson('/api/changelog'),
    staleTime: 5 * 60_000,
  });
}
