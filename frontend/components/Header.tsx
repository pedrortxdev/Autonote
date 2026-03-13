'use client';

import { LogOut, Building2 } from 'lucide-react';
import { logout, getEmpresaId } from '@/lib/api';

/**
 * Header - App header with company info and logout
 */
export function Header() {
  const empresaId = getEmpresaId();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-neutral-200 safe-top">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo / App name */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-neutral-900">Autonote</span>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Company ID display */}
          {empresaId && (
            <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-md">
              Empresa: {empresaId}
            </span>
          )}
          
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
