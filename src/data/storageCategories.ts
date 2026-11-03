import type { FurnitureKind } from './furniture';

export const STORAGE_CATEGORIES = [
  { id: 'tables', label: 'Tables', kind: 'table' },
  { id: 'chairs', label: 'Chairs', kind: 'chair' },
  { id: 'decorations', label: 'Decorations', kind: 'floorDecor' },
  { id: 'wall', label: 'Wall items', kind: 'wallDecor' },
  { id: 'rugs', label: 'Rugs', kind: 'rug' },
] as const satisfies readonly { id: string; label: string; kind: FurnitureKind }[];

export type StorageCategory = typeof STORAGE_CATEGORIES[number]['id'];
