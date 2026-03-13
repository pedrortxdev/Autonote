/**
 * API Client - Handles all backend communication
 * Uses native FormData for file uploads (NOT Base64)
 */

import type {
  ApiResponse,
  UploadResponse,
  ProcessingTask,
  LoginRequest,
  LoginResponse,
} from '@/types';

// Get base API URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Check if running in Codespaces (use proxy to avoid CORS issues)
const isCodespaces = typeof window !== 'undefined' && 
  window.location.hostname.includes('app.github.dev');

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Use proxy in Codespaces to avoid CORS issues
  const url = isCodespaces 
    ? `/api/proxy?path=${encodeURIComponent(endpoint)}`
    : `${API_URL}${endpoint}`;

  // Get auth token from session storage if available
  const token = typeof window !== 'undefined'
    ? sessionStorage.getItem('auth_token')
    : null;

  const headers: HeadersInit = {
    ...options.headers,
  };

  // Only add Content-Type if not already set (FormData sets its own boundary)
  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  // Add auth header if token exists
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'An error occurred',
      };
    }

    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Login with company code
 */
export async function login(codigoEmpresa: string): Promise<LoginResponse> {
  const response = await fetchApi<LoginResponse>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ codigoEmpresa }),
  });

  if (!response.success) {
    return {
      success: false,
      error: response.error,
    };
  }

  // Store token in session storage
  if (response.data?.token) {
    sessionStorage.setItem('auth_token', response.data.token);
    sessionStorage.setItem('empresa_id', response.data.empresaId || '');
  }

  return response.data || { success: false, error: 'No response data' };
}

/**
 * Logout - clear session
 */
export function logout(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('empresa_id');
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!sessionStorage.getItem('auth_token');
}

/**
 * Get stored empresa ID
 */
export function getEmpresaId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('empresa_id');
}

/**
 * Upload document using native FormData (NOT Base64)
 * This is critical for large files and camera captures
 */
export async function uploadDocument(file: File): Promise<ApiResponse<UploadResponse>> {
  // Create native FormData object - this is the correct way to upload files
  const formData = new FormData();
  formData.append('file', file);

  // Add empresa ID if available
  const empresaId = getEmpresaId();
  if (empresaId) {
    formData.append('empresaId', empresaId);
  }

  // Use proxy in Codespaces to avoid CORS issues
  const url = isCodespaces 
    ? `/api/proxy?path=${encodeURIComponent('/api/documents/upload')}`
    : `${API_URL}/api/documents/upload`;

  const token = typeof window !== 'undefined'
    ? sessionStorage.getItem('auth_token')
    : null;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: token && !isCodespaces ? {
        'Authorization': `Bearer ${token}`,
      } : {},
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'Upload failed',
      };
    }

    return {
      success: true,
      data: data as UploadResponse,
    };
  } catch (error) {
    console.error('Upload Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get task status for polling
 */
export async function getTaskStatus(taskId: string): Promise<ApiResponse<ProcessingTask>> {
  return fetchApi<ProcessingTask>(`/api/tasks/${taskId}`);
}

/**
 * Confirm and send processed document to system
 */
export async function confirmDocument(taskId: string): Promise<ApiResponse<{ success: boolean }>> {
  return fetchApi<{ success: boolean }>(`/api/tasks/${taskId}/confirm`, {
    method: 'POST',
  });
}

/**
 * Get documents list
 */
export async function getDocuments(): Promise<ApiResponse<{ documents: any[] }>> {
  return fetchApi<{ documents: any[] }>('/api/documents');
}

export default {
  login,
  logout,
  isAuthenticated,
  getEmpresaId,
  uploadDocument,
  getTaskStatus,
  confirmDocument,
  getDocuments,
};
