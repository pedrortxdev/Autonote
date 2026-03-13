'use client';

import { Check, RefreshCw, Send } from 'lucide-react';
import type { ProcessingResult } from '@/types';

/**
 * ResultDisplay - Shows extracted document data with confirmation options
 * 
 * Features:
 * - Green flash animation on completion
 * - Clear display of extracted summary
 * - Structured data display
 * - Action buttons for next steps
 * - Accessible with proper focus management
 */
interface ResultDisplayProps {
  result: ProcessingResult;
  onConfirm: () => void;
  onRetry: () => void;
  isConfirming?: boolean;
}

export function ResultDisplay({
  result,
  onConfirm,
  onRetry,
  isConfirming = false,
}: ResultDisplayProps) {
  const { summary, extractedData, confidence } = result;

  return (
    <div 
      className="w-full max-w-sm mx-auto animate-slide-up"
      role="region"
      aria-label="Resultado do processamento"
    >
      {/* Success flash overlay */}
      <div className="fixed inset-0 pointer-events-none animate-success-flash z-0" />

      <div className="relative z-10">
        {/* Header with success indicator */}
        <div className="card text-center mb-4 border-2 border-success-200 bg-success-50/50">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-success-500 rounded-full mb-4 shadow-lg">
            <Check className="w-8 h-8 text-white" strokeWidth={3} />
          </div>
          
          <h2 className="text-2xl font-bold text-success-700 mb-1">
            Documento Processado!
          </h2>
          
          <p className="text-sm text-success-600">
            Confiança: {Math.round(confidence * 100)}%
          </p>
        </div>

        {/* Summary display */}
        <div className="card mb-4">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
            Resumo Extraído
          </h3>
          
          <p className="text-lg text-neutral-900 font-medium text-balance">
            {summary}
          </p>
        </div>

        {/* Structured data */}
        {extractedData && Object.keys(extractedData).length > 0 && (
          <div className="card mb-4">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
              Dados Extraídos
            </h3>
            
            <dl className="space-y-3">
              {extractedData.fornecedor && (
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <dt className="text-sm text-neutral-500">Fornecedor</dt>
                  <dd className="text-base font-medium text-neutral-900">
                    {extractedData.fornecedor}
                  </dd>
                </div>
              )}
              
              {extractedData.valor && (
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <dt className="text-sm text-neutral-500">Valor</dt>
                  <dd className="text-base font-medium text-neutral-900">
                    {extractedData.valor}
                  </dd>
                </div>
              )}
              
              {extractedData.data && (
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <dt className="text-sm text-neutral-500">Data</dt>
                  <dd className="text-base font-medium text-neutral-900">
                    {extractedData.data}
                  </dd>
                </div>
              )}
              
              {extractedData.numeroDocumento && (
                <div className="flex justify-between items-center py-2">
                  <dt className="text-sm text-neutral-500">Nº Documento</dt>
                  <dd className="text-base font-medium text-neutral-900">
                    {extractedData.numeroDocumento}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className={`
              btn-primary w-full
              bg-success-600 hover:bg-success-700
              disabled:bg-success-400
              flex items-center justify-center gap-2
            `}
            aria-label="Enviar documento para o sistema"
          >
            {isConfirming ? (
              <>
                <Loader2Spinner />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Enviar para o Sistema</span>
              </>
            )}
          </button>

          <button
            onClick={onRetry}
            disabled={isConfirming}
            className="btn-secondary w-full flex items-center justify-center gap-2"
            aria-label="Capturar outro documento"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Capturar Outro</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple spinner component for loading state
function Loader2Spinner() {
  return (
    <svg 
      className="animate-spin h-5 w-5" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default ResultDisplay;
