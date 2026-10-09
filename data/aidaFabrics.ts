import { AidaFabric } from '@/types/pattern';

export const AIDA_FABRICS: AidaFabric[] = [
  {
    count: 6,
    name: '6-count Aida',
    colors: [
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Antique White', hex: '#FAEBD7' },
      { name: 'Black', hex: '#000000' },
    ],
  },
  {
    count: 11,
    name: '11-count Aida',
    colors: [
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Cream', hex: '#FFFDD0' },
      { name: 'Ivory', hex: '#FFFFF0' },
      { name: 'Black', hex: '#000000' },
      { name: 'Navy', hex: '#000080' },
      { name: 'Red', hex: '#DC143C' },
    ],
  },
  {
    count: 14,
    name: '14-count Aida',
    colors: [
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Ivory', hex: '#FFFFF0' },
      { name: 'Cream', hex: '#FFFDD0' },
      { name: 'Antique White', hex: '#FAEBD7' },
      { name: 'Ecru', hex: '#F0EAD6' },
      { name: 'Beige', hex: '#F5F5DC' },
      { name: 'Tan', hex: '#D2B48C' },
      { name: 'Light Gray', hex: '#D3D3D3' },
      { name: 'Gray', hex: '#808080' },
      { name: 'Black', hex: '#000000' },
      { name: 'Navy', hex: '#000080' },
      { name: 'Royal Blue', hex: '#4169E1' },
      { name: 'Light Blue', hex: '#ADD8E6' },
      { name: 'Pink', hex: '#FFC0CB' },
      { name: 'Rose', hex: '#FFB6C1' },
      { name: 'Red', hex: '#DC143C' },
      { name: 'Burgundy', hex: '#800020' },
      { name: 'Hunter Green', hex: '#355E3B' },
      { name: 'Forest Green', hex: '#228B22' },
      { name: 'Light Green', hex: '#90EE90' },
      { name: 'Yellow', hex: '#FFFFE0' },
    ],
  },
  {
    count: 16,
    name: '16-count Aida',
    colors: [
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Ivory', hex: '#FFFFF0' },
      { name: 'Cream', hex: '#FFFDD0' },
      { name: 'Antique White', hex: '#FAEBD7' },
      { name: 'Ecru', hex: '#F0EAD6' },
      { name: 'Beige', hex: '#F5F5DC' },
      { name: 'Tan', hex: '#D2B48C' },
      { name: 'Light Gray', hex: '#D3D3D3' },
      { name: 'Gray', hex: '#808080' },
      { name: 'Pewter', hex: '#8D8D8D' },
      { name: 'Black', hex: '#000000' },
      { name: 'Navy', hex: '#000080' },
      { name: 'Royal Blue', hex: '#4169E1' },
      { name: 'Light Blue', hex: '#ADD8E6' },
      { name: 'Pink', hex: '#FFC0CB' },
      { name: 'Light Pink', hex: '#FFB6C1' },
      { name: 'Red', hex: '#DC143C' },
      { name: 'Burgundy', hex: '#800020' },
      { name: 'Hunter Green', hex: '#355E3B' },
      { name: 'Forest Green', hex: '#228B22' },
    ],
  },
  {
    count: 18,
    name: '18-count Aida',
    colors: [
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Ivory', hex: '#FFFFF0' },
      { name: 'Cream', hex: '#FFFDD0' },
      { name: 'Antique White', hex: '#FAEBD7' },
      { name: 'Ecru', hex: '#F0EAD6' },
      { name: 'Beige', hex: '#F5F5DC' },
      { name: 'Tan', hex: '#D2B48C' },
      { name: 'Light Gray', hex: '#D3D3D3' },
      { name: 'Gray', hex: '#808080' },
      { name: 'Black', hex: '#000000' },
      { name: 'Navy', hex: '#000080' },
      { name: 'Light Blue', hex: '#ADD8E6' },
      { name: 'Pink', hex: '#FFC0CB' },
    ],
  },
  {
    count: 22,
    name: '22-count Aida',
    colors: [
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Ivory', hex: '#FFFFF0' },
      { name: 'Cream', hex: '#FFFDD0' },
      { name: 'Ecru', hex: '#F0EAD6' },
      { name: 'Light Gray', hex: '#D3D3D3' },
      { name: 'Black', hex: '#000000' },
    ],
  },
  {
    count: 28,
    name: '28-count (over 2) Aida',
    colors: [
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Ivory', hex: '#FFFFF0' },
      { name: 'Cream', hex: '#FFFDD0' },
      { name: 'Ecru', hex: '#F0EAD6' },
      { name: 'Black', hex: '#000000' },
    ],
  },
];

// Default fabric for new patterns
export const DEFAULT_FABRIC = AIDA_FABRICS[2]; // 14-count Aida

// Helper function to get fabric by count
export function getFabricByCount(count: number): AidaFabric | undefined {
  return AIDA_FABRICS.find(fabric => fabric.count === count);
}

// Helper function to get all available fabric counts
export function getAllFabricCounts(): number[] {
  return AIDA_FABRICS.map(fabric => fabric.count);
}
