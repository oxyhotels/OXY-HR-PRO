import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDepartments() {
  const { data: departments, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/organization/public-departments');
      if (res?.data?.departments) {
        return res.data.departments as string[];
      } else if (res?.departments) {
        return res.departments as string[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  return { departments: departments || [], loading, error, refetch };
}
