'use client';

import { useEffect, useCallback, useRef } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ProcessingTask, ProcessingResult } from '@/types';
import { getTaskStatus } from '@/lib/api';

/**
 * StatusPoller - Polls backend for task completion
 * 
 * Features:
 * - Silent polling every 3 seconds (configurable)
 * - Beautiful spinner animation
 * - Progress indication
 * - Automatic stop on completion or error
 * - Accessible status announcements
 */
interface StatusPollerProps {
  taskId: string;
  onStatusUpdate: (task: ProcessingTask) => void;
  onComplete: (result: ProcessingResult) => void;
  onError: (error: string) => void;
  pollingInterval?: number;
}

export function StatusPoller({
  taskId,
  onStatusUpdate,
  onComplete,
  onError,
  pollingInterval = 3000,
}: StatusPollerProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);

  const checkStatus = useCallback(async () => {
    try {
      const response = await getTaskStatus(taskId);

      if (!response.success || !response.data) {
        onError(response.error || 'Erro ao verificar status');
        return;
      }

      const task = response.data;
      
      // Notify parent of status update
      onStatusUpdate(task);

      // Check for completion
      if (task.status === 'completed') {
        hasCompletedRef.current = true;
        if (task.result) {
          onComplete(task.result);
        } else {
          onError('Processamento concluído, mas sem resultados');
        }
        return;
      }

      // Check for error
      if (task.status === 'failed') {
        hasCompletedRef.current = true;
        onError(task.error || 'Falha no processamento');
        return;
      }

      // Continue polling for pending/processing
    } catch (error) {
      console.error('Polling error:', error);
      onError(error instanceof Error ? error.message : 'Erro de conexão');
    }
  }, [taskId, onStatusUpdate, onComplete, onError]);

  useEffect(() => {
    // Initial check
    checkStatus();

    // Set up polling interval
    intervalRef.current = setInterval(checkStatus, pollingInterval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkStatus, pollingInterval]);

  // Prevent re-polling after completion
  useEffect(() => {
    if (hasCompletedRef.current && intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  return null; // This component has no UI, it's a logic hook
}

/**
 * StatusDisplay - Visual component showing processing status
 */
interface StatusDisplayProps {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress?: number;
  message?: string;
}

export function StatusDisplay({ 
  status, 
  progress = 0, 
  message 
}: StatusDisplayProps) {
  if (status === 'idle') {
    return null;
  }

  return (
    <div 
      className="w-full max-w-sm mx-auto animate-slide-up"
      role="status"
      aria-live="polite"
    >
      <div className="card text-center">
        {/* Icon based on status */}
        <div className="mb-4 flex justify-center">
          {status === 'uploading' && (
            <div className="p-4 bg-primary-50 rounded-full">
              <Loader2 className="w-8 h-8 text-primary-600 spinner" />
            </div>
          )}
          
          {status === 'processing' && (
            <div className="p-4 bg-primary-50 rounded-full">
              <Loader2 className="w-8 h-8 text-primary-600 spinner" />
            </div>
          )}
          
          {status === 'completed' && (
            <div className="p-4 bg-success-50 rounded-full animate-success-flash">
              <CheckCircle2 className="w-8 h-8 text-success-600" />
            </div>
          )}
          
          {status === 'error' && (
            <div className="p-4 bg-red-50 rounded-full">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          )}
        </div>

        {/* Status text */}
        <h3 className="text-lg font-semibold text-neutral-900 mb-1">
          {status === 'uploading' && 'Enviando documento...'}
          {status === 'processing' && 'Processando documento...'}
          {status === 'completed' && 'Processamento concluído!'}
          {status === 'error' && 'Erro no processamento'}
        </h3>

        {/* Message */}
        {message && (
          <p className="text-sm text-neutral-600 mb-4">
            {message}
          </p>
        )}

        {/* Progress bar for processing */}
        {(status === 'uploading' || status === 'processing') && (
          <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-primary-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}

        {/* Status badge */}
        <div className="mt-4">
          <span className={`status-badge ${status}`}>
            {status === 'uploading' && 'Enviando'}
            {status === 'processing' && 'Processando'}
            {status === 'completed' && 'Concluído'}
            {status === 'error' && 'Erro'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default StatusPoller;
