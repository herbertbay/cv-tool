'use client';

import { useEffect } from 'react';
import { ChangePasswordForm } from './ChangePasswordForm';

type AccountModalProps = {
  onClose: () => void;
};

export function AccountModal({ onClose }: AccountModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md max-h-[min(90vh,720px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="account-modal-title" className="text-xl font-semibold text-slate-900">
          Account
        </h2>
        <p className="mt-1 text-sm text-slate-600">Change your password.</p>
        <div className="mt-6">
          <ChangePasswordForm onCancel={onClose} />
        </div>
      </div>
    </div>
  );
}
