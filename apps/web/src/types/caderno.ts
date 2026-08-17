export type CadernoNodeType = 'sticky' | 'text' | 'checklist' | 'image' | 'shape';

export interface CadernoNode {
  id: number;
  type: CadernoNodeType;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  color?: string;
  url?: string;
  items?: { text: string; done: boolean }[];
  studyContent?: string;
  studyCreatedAt?: number;
  studyUpdatedAt?: number;
}

export interface CadernoEdge {
  id: number;
  from: number;
  to: number;
}

export interface CadernoBoard {
  id: string;
  name: string;
  updatedAt: number;
  nodes: CadernoNode[];
  edges: CadernoEdge[];
}
