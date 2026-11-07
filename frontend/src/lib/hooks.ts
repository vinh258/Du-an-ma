import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { Faculty, Subject } from './types';

export const useFaculties = () =>
  useQuery({ queryKey: ['faculties'], queryFn: async () => (await api.get<Faculty[]>('/faculties')).data, staleTime: 5 * 60_000 });

export const useSubjects = (facultyId?: number | '') =>
  useQuery({
    queryKey: ['subjects', facultyId || 'all'],
    queryFn: async () => (await api.get<Subject[]>('/subjects', { params: facultyId ? { facultyId } : {} })).data,
    staleTime: 5 * 60_000,
  });
