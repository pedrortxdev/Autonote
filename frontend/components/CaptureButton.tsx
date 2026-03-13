'use client';

import { useRef, useCallback } from 'react';
import { Camera, Upload } from 'lucide-react';
import type { CaptureButtonProps } from '@/types';

/**
 * CaptureButton - Large, touch-friendly button for document capture
 * 
 * Features:
 * - Uses native file input with capture="environment" to force rear camera on mobile
 * - Accepts images and PDFs
 * - Large 50% width design for easy tapping
 * - Visual feedback on interaction
 * - Accessible with proper ARIA labels
 */
export function CaptureButton({ onFileSelected, disabled = false }: CaptureButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'image/jpeg',
        'image/png',
        'image/heic',
        'image/heif',
        'application/pdf',
      ];
      
      if (!validTypes.includes(file.type)) {
        alert('Por favor, capture uma imagem ou PDF válido.');
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('O arquivo é muito grande. Máximo: 10MB.');
        return;
      }

      onFileSelected(file);
    }

    // Reset input to allow selecting the same file again
    event.target.value = '';
  }, [onFileSelected]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Hidden file input with capture attribute for mobile camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        disabled={disabled}
      />

      {/* Large capture button - 50% of screen width on mobile */}
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          relative overflow-hidden
          w-full max-w-sm aspect-[4/3] sm:aspect-[16/9]
          bg-gradient-to-br from-primary-600 to-primary-700
          hover:from-primary-700 hover:to-primary-800
          active:from-primary-800 active:to-primary-900
          disabled:from-neutral-300 disabled:to-neutral-400
          rounded-3xl
          shadow-soft-lg
          transition-all duration-200 ease-out
          active:scale-[0.98]
          focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/50
          group
        `}
        aria-label="Capturar documento usando a câmera"
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,white_1px,transparent_1px)] bg-[length:20px_20px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full p-6">
          {/* Icon */}
          <div className="mb-4 p-4 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform duration-200">
            <Camera 
              className="w-10 h-10 sm:w-12 sm:h-12 text-white" 
              strokeWidth={1.5}
            />
          </div>

          {/* Text */}
          <span className="text-white text-xl sm:text-2xl font-bold text-center text-balance">
            CAPTURAR
            <br />
            DOCUMENTO
          </span>

          {/* Hint */}
          <span className="mt-2 text-white/80 text-sm text-center">
            Toque para usar a câmera
          </span>
        </div>

        {/* Shine effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </div>
      </button>

      {/* Alternative: Upload from gallery */}
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          inline-flex items-center gap-2
          px-6 py-3
          text-neutral-600 hover:text-neutral-800
          text-sm font-medium
          transition-colors
          disabled:opacity-50
        `}
        aria-label="Ou selecione um arquivo da galeria"
      >
        <Upload className="w-4 h-4" />
        <span>Ou selecione da galeria</span>
      </button>
    </div>
  );
}

export default CaptureButton;
