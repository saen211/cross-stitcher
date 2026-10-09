import { api } from './client';
import { Pattern } from '@/types/pattern';
import { serializePattern, deserializePattern } from '@/lib/db/patternDB';

export interface PatternSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface PatternResponse {
  id: string;
  name: string;
  data: string;
  createdAt: string;
  updatedAt: string;
}

export async function listPatterns(): Promise<PatternSummary[]> {
  return api.get<PatternSummary[]>('/patterns');
}

export async function getPattern(id: string): Promise<Pattern> {
  const res = await api.get<PatternResponse>(`/patterns/${id}`);
  return deserializePattern(JSON.parse(res.data));
}

export async function savePattern(pattern: Pattern): Promise<PatternSummary> {
  const data = JSON.stringify(serializePattern(pattern));
  return api.put<PatternSummary>(`/patterns/${pattern.id}`, {
    name: pattern.name,
    data,
  });
}

export async function deletePattern(id: string): Promise<void> {
  return api.delete<void>(`/patterns/${id}`);
}
