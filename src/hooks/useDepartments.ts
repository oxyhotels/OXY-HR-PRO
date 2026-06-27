import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DEPARTMENTS as STATIC_DEPARTMENTS } from '@/constants/departments';

export function useDepartments() {
  const [departments, setDepartments] = useState<string[]>([...STATIC_DEPARTMENTS]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/organization/public-departments');
        if (res?.data?.departments) {
          setDepartments(res.data.departments);
        } else if (res?.departments) {
          setDepartments(res.departments);
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();
  }, []);

  return { departments, loading };
}
