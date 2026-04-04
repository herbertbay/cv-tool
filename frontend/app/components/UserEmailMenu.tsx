'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { AccountModal } from './AccountModal';

export function UserEmailMenu({ email }: { email: string }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const openAccountModal = () => {
    setOpen(false);
    setAccountModalOpen(true);
  };

  const doLogout = async () => {
    setConfirmLogout(false);
    setOpen(false);
    await logout();
    if (typeof window !== 'undefined') window.location.href = '/';
  };

  return (
    <>
      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-sm text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline max-w-[200px] truncate text-left"
          title={email}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {email}
        </button>
        {open && (
          <div
            className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              onClick={openAccountModal}
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              Account
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setConfirmLogout(true);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        )}
      </div>

      {accountModalOpen && <AccountModal onClose={() => setAccountModalOpen(false)} />}

      {confirmLogout && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 id="logout-dialog-title" className="text-lg font-semibold text-slate-900">
              Log out?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              You will need to sign in again to access your applications and profile.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doLogout}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
