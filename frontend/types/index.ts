/**
 * Document Processing System - Type Definitions
 */

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Document Types
export interface Document {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
  status: DocumentStatus;
  taskId?: string;
}

export type DocumentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

// Task/Processing Types
export interface ProcessingTask {
  id: string;
  documentId: string;
  status: DocumentStatus;
  progress: number;
  result?: ProcessingResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingResult {
  summary: string;
  extractedData: ExtractedData;
  confidence: number;
}

export interface ExtractedData {
  fornecedor?: string;
  valor?: string;
  data?: string;
  numeroDocumento?: string;
  [key: string]: string | undefined;
}

// Upload Types
export interface UploadResponse {
  taskId: string;
  documentId: string;
  message: string;
}

export interface UploadError {
  code: string;
  message: string;
  field?: string;
}

// Auth Types
export interface AuthSession {
  empresaId: string;
  token: string;
  expiresAt: number;
}

export interface LoginRequest {
  codigoEmpresa: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  empresaId?: string;
  error?: string;
}

// UI State Types
export interface CaptureState {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  taskId: string | null;
  progress: number;
  result: ProcessingResult | null;
  error: string | null;
}

// Component Props
export interface CaptureButtonProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export interface StatusPollerProps {
  taskId: string;
  onStatusUpdate: (task: ProcessingTask) => void;
  onComplete: (result: ProcessingResult) => void;
  onError: (error: string) => void;
  pollingInterval?: number;
}

export interface ResultDisplayProps {
  result: ProcessingResult;
  onConfirm: () => void;
  onRetry: () => void;
}

// Environment Variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_API_URL: string;
    }
  }
}

export {};
