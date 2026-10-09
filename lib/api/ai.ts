import { api } from './client';
import { GeneratePatternRequest, GeneratePatternResponse } from '@/types/api';
import { Stitch } from '@/types/pattern';

export async function generatePattern(req: GeneratePatternRequest): Promise<{ stitches: Stitch[]; colorsUsed: string[]; totalStitches: number; estimatedTime: number }> {
  const res = await api.post<GeneratePatternResponse>('/ai/generate', req);

  const stitches: Stitch[] = [];
  for (let y = 0; y < res.pattern.length; y++) {
    for (let x = 0; x < res.pattern[y].length; x++) {
      const code = res.pattern[y][x];
      if (code && code !== '' && code !== 'null') {
        stitches.push({ x, y, dmcCode: code });
      }
    }
  }

  return {
    stitches,
    colorsUsed: res.metadata.colorsUsed,
    totalStitches: res.metadata.totalStitches,
    estimatedTime: res.metadata.estimatedTime,
  };
}
