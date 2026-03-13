'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ArrowRight, Loader2 } from 'lucide-react';
import { login, isAuthenticated } from '@/lib/api';

/**
 * Login Page - Simple company code input
 * 
 * Features:
 * - Clean, focused design
 * - Numeric input optimized for mobile
 * - Loading state during authentication
 * - Error handling with user-friendly messages
 * - Auto-redirect if already authenticated
 */
export default function LoginPage() {
  const router = useRouter();
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate input
    if (!codigoEmpresa.trim()) {
      setError('Por favor, informe o código da empresa');
      return;
    }

    if (codigoEmpresa.trim().length < 3) {
      setError('Código da empresa deve ter pelo menos 3 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(codigoEmpresa.trim());

      if (response.success) {
        // Navigate to dashboard on success
        router.push('/dashboard');
      } else {
        setError(response.error || 'Erro ao autenticar. Verifique o código e tente novamente.');
      }
    } catch (err) {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [codigoEmpresa, router]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow alphanumeric characters
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCodigoEmpresa(value);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="safe-top pt-8 pb-6 px-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-soft">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Autonote</h1>
            <p className="text-sm text-neutral-500">Captura Inteligente de Documentos</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="w-full max-w-sm mx-auto">
          {/* Welcome message */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-neutral-900 mb-2 text-balance">
              Bem-vindo
            </h2>
            <p className="text-neutral-600">
              Informe o código da sua empresa para acessar o sistema de captura de documentos.
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Company code input */}
            <div>
              <label 
                htmlFor="codigo-empresa" 
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                Código da Empresa
              </label>
              <input
                id="codigo-empresa"
                type="text"
                inputMode="text"
                autoComplete="organization"
                value={codigoEmpresa}
                onChange={handleInputChange}
                placeholder="Ex: ABC123"
                disabled={isLoading}
                className={`
                  input-field uppercase tracking-wide
                  ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
                `}
                aria-invalid={!!error}
                aria-describedby={error ? 'error-message' : undefined}
                autoFocus
              />
              
              {/* Error message */}
              {error && (
                <p 
                  id="error-message"
                  className="mt-2 text-sm text-red-600 flex items-center gap-1"
                  role="alert"
                >
                  <span className="inline-block w-1 h-1 bg-red-600 rounded-full" />
                  {error}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !codigoEmpresa.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
              aria-label="Entrar no sistema"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 spinner" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Help text */}
          <p className="mt-8 text-center text-sm text-neutral-500">
            Não sabe o código da empresa?{' '}
            <button 
              type="button"
              className="text-primary-600 hover:text-primary-700 font-medium underline underline-offset-2"
              onClick={() => alert('Entre em contato com o administrador do sistema.')}
            >
              Contate o administrador
            </button>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="safe-bottom py-6 px-6 text-center">
        <p className="text-xs text-neutral-400">
          © 2024 Autonote. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
