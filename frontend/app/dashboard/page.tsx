'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Clock, History } from 'lucide-react';
import { CaptureButton } from '@/components/CaptureButton';
import { StatusPoller, StatusDisplay } from '@/components/StatusPoller';
import { ResultDisplay } from '@/components/ResultDisplay';
import { Header } from '@/components/Header';
import { uploadDocument, getTaskStatus, confirmDocument, isAuthenticated } from '@/lib/api';
import type { CaptureState, ProcessingTask, ProcessingResult } from '@/types';

/**
 * Dashboard Page - Main document capture interface
 * 
 * Flow:
 * 1. User captures document via camera
 * 2. File is uploaded via FormData (NOT Base64)
 * 3. Backend returns task_id
 * 4. Silent polling every 3 seconds
 * 5. On completion, show extracted data
 * 6. User confirms to send to system
 */
export default function DashboardPage() {
  const router = useRouter();
  
  // Auth check
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
    }
  }, [router]);

  // Capture state
  const [captureState, setCaptureState] = useState<CaptureState>({
    status: 'idle',
    taskId: null,
    progress: 0,
    result: null,
    error: null,
  });

  const [statusMessage, setStatusMessage] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  // Handle file selection from CaptureButton
  const handleFileSelected = useCallback(async (file: File) => {
    setCaptureState(prev => ({ ...prev, status: 'uploading', progress: 0, error: null }));
    setStatusMessage(`Enviando ${file.name}...`);

    try {
      // Upload using native FormData (NOT Base64)
      const response = await uploadDocument(file);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha no upload');
      }

      const { taskId } = response.data;

      // Transition to processing state
      setCaptureState(prev => ({
        ...prev,
        status: 'processing',
        taskId,
        progress: 10,
      }));
      setStatusMessage('Documento enviado. Processando...');

    } catch (error) {
      console.error('Upload error:', error);
      setCaptureState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro no upload',
      }));
      setStatusMessage('Erro ao enviar documento. Tente novamente.');
    }
  }, []);

  // Handle status updates from poller
  const handleStatusUpdate = useCallback((task: ProcessingTask) => {
    setCaptureState(prev => ({
      ...prev,
      progress: task.progress || (task.status === 'processing' ? 50 : 0),
    }));

    // Update status message based on task status
    if (task.status === 'processing') {
      setStatusMessage('Analisando documento com IA...');
    }
  }, []);

  // Handle completion
  const handleComplete = useCallback((result: ProcessingResult) => {
    setCaptureState(prev => ({
      ...prev,
      status: 'completed',
      result,
      progress: 100,
    }));
    setStatusMessage('Processamento concluído!');
  }, []);

  // Handle errors from poller
  const handleError = useCallback((error: string) => {
    setCaptureState(prev => ({
      ...prev,
      status: 'error',
      error,
    }));
    setStatusMessage(error);
  }, []);

  // Handle confirmation (send to system)
  const handleConfirm = useCallback(async () => {
    if (!captureState.taskId) return;

    setIsConfirming(true);

    try {
      const response = await confirmDocument(captureState.taskId);

      if (response.success) {
        // Show success briefly then reset
        alert('Documento enviado com sucesso para o sistema!');
        resetCapture();
      } else {
        throw new Error(response.error || 'Falha ao confirmar');
      }
    } catch (error) {
      console.error('Confirm error:', error);
      alert('Erro ao enviar para o sistema. Tente novamente.');
    } finally {
      setIsConfirming(false);
    }
  }, [captureState.taskId]);

  // Handle retry (capture another document)
  const handleRetry = useCallback(() => {
    resetCapture();
  }, []);

  // Reset capture state
  const resetCapture = useCallback(() => {
    setCaptureState({
      status: 'idle',
      taskId: null,
      progress: 0,
      result: null,
      error: null,
    });
    setStatusMessage('');
    setIsConfirming(false);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />

      <main className="max-w-lg mx-auto px-4 py-6 safe-bottom">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">
            Capturar Documento
          </h1>
          <p className="text-sm text-neutral-600">
            Tire uma foto do documento para processar
          </p>
        </div>

        {/* Main capture area */}
        <div className="flex flex-col items-center">
          {/* Capture Button - shown when idle */}
          {captureState.status === 'idle' && (
            <div className="w-full flex flex-col items-center animate-fade-in">
              <CaptureButton
                onFileSelected={handleFileSelected}
                disabled={false}
              />

              {/* Quick tips */}
              <div className="mt-8 w-full">
                <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3 text-center">
                  Dicas para melhor resultado
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <TipCard
                    icon={<FileText className="w-5 h-5" />}
                    text="Documento visível"
                  />
                  <TipCard
                    icon={<Clock className="w-5 h-5" />}
                    text="Boa iluminação"
                  />
                  <TipCard
                    icon={<History className="w-5 h-5" />}
                    text="Sem reflexos"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Status Display - shown when uploading/processing */}
          {(captureState.status === 'uploading' || captureState.status === 'processing') && (
            <>
              <StatusDisplay
                status={captureState.status}
                progress={captureState.progress}
                message={statusMessage}
              />
              
              {/* Hidden poller component */}
              {captureState.taskId && (
                <StatusPoller
                  taskId={captureState.taskId}
                  onStatusUpdate={handleStatusUpdate}
                  onComplete={handleComplete}
                  onError={handleError}
                  pollingInterval={3000}
                />
              )}
            </>
          )}

          {/* Error Display */}
          {captureState.status === 'error' && (
            <div className="w-full max-w-sm mx-auto animate-slide-up">
              <div className="card text-center border-2 border-red-200 bg-red-50">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Erro no Processamento
                </h3>
                <p className="text-sm text-red-600 mb-4">
                  {captureState.error || 'Ocorreu um erro. Tente novamente.'}
                </p>
                <button
                  onClick={resetCapture}
                  className="btn-primary w-full bg-red-600 hover:bg-red-700"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          )}

          {/* Result Display - shown when completed */}
          {captureState.status === 'completed' && captureState.result && (
            <ResultDisplay
              result={captureState.result}
              onConfirm={handleConfirm}
              onRetry={handleRetry}
              isConfirming={isConfirming}
            />
          )}
        </div>

        {/* Recent documents section (placeholder for future) */}
        {captureState.status === 'idle' && (
          <div className="mt-12">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4">
              Documentos Recentes
            </h3>
            <div className="card text-center py-8">
              <FileText className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm">
                Nenhum documento recente
              </p>
              <p className="text-neutral-400 text-xs mt-1">
                Seus documentos processados aparecerão aqui
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * TipCard - Small card for displaying tips
 */
function TipCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="bg-white rounded-xl p-3 text-center shadow-soft">
      <div className="text-primary-600 mb-2 flex justify-center">{icon}</div>
      <p className="text-xs font-medium text-neutral-700">{text}</p>
    </div>
  );
}
