export interface Point2D {
  x: number;
  y: number;
}

export interface CenterPoint {
  a: number;
  b: number;
}

export type ShapeType = 'point' | 'triangle' | 'square';

export type RotationDirection = 1 | -1;

export interface RotationState {
  point: Point2D;
  center: CenterPoint;
  angleDegree: number;
  direction: RotationDirection;
  shape: ShapeType;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  answerTex?: string;
  options: Point2D[];
  correctIndex: number;
  explanation: string;
  params: RotationState;
}

export type ThemeMode = 'light' | 'dark';
