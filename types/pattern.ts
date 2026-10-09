// Core pattern and stitch types

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  stitches: Map<string, Stitch>;
}

export interface Pattern {
  id: string;
  name: string;
  width: number;   // Grid width in stitches
  height: number;  // Grid height in stitches
  fabricCount: number; // Aida count (6, 11, 14, 16, 18, 22, 28)
  fabricColor: string; // Hex color
  layers: Layer[];
  activeLayerId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: PatternMetadata;
}

export interface Stitch {
  x: number;
  y: number;
  dmcCode: string; // DMC floss code (e.g., "310", "blanc", "ecru")
  symbol?: string; // Auto-assigned symbol for pattern guide
}

export interface PatternMetadata {
  aiGenerated?: boolean;
  originalPrompt?: string;
  estimatedTime?: number; // Minutes to complete
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface DMCColor {
  code: string; // e.g., "310"
  name: string; // e.g., "Black"
  hex: string;  // e.g., "#000000"
  rgb: {
    r: number;
    g: number;
    b: number;
  };
}

export interface ColorUsage {
  dmcCode: string;
  dmcColor: DMCColor;
  stitchCount: number;
  threadLength: number; // In inches
  skeinsNeeded: number;
  symbol: string;
}

export interface AidaFabric {
  count: number; // Stitches per inch
  name: string;  // e.g., "14-count Aida"
  colors: Array<{
    name: string; // e.g., "White", "Cream", "Black"
    hex: string;
  }>;
}

// ── Serialization ─────────────────────────────────────────────────────────────

export interface SerializedLayer {
  id: string;
  name: string;
  visible: boolean;
  stitches: Array<[string, Stitch]>;
}

/** Stored in IndexedDB. Supports both the new multi-layer format and the legacy
 *  single-stitches format so old saved patterns still load correctly. */
export interface SerializedPattern {
  id: string;
  name: string;
  width: number;
  height: number;
  fabricCount: number;
  fabricColor: string;
  // New format
  layers?: SerializedLayer[];
  activeLayerId?: string;
  // Legacy format (pre-layers) — kept for migration only
  stitches?: Array<[string, Stitch]>;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  metadata?: PatternMetadata;
}
