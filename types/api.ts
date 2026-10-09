// API request and response types

export interface GeneratePatternRequest {
  prompt: string;
  width: number;
  height: number;
  maxColors?: number;
  style?: string; // e.g., "pixelart", "realistic"
}

export interface RefinePatternRequest {
  currentPattern: string[][]; // 2D array of DMC codes
  prompt: string;
  width: number;
  height: number;
}

export interface PatternMetadataResponse {
  colorsUsed: string[];
  totalStitches: number;
  estimatedTime: number; // in minutes
}

export interface GeneratePatternResponse {
  pattern: string[][]; // 2D array where each cell is "" or DMC code
  metadata: PatternMetadataResponse;
  success: boolean;
  error?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

export interface HealthResponse {
  status: string;
  version: string;
}
