import { ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '◆' },
  { to: '/accounts', label: 'Bank Accounts', icon: '▤' },
  { to: '/investments', label: 'Investments', icon: '▲' },
  { to: '/insurance', label: 'Insurance & Takaful', icon: '◈' },
  { to: '/contacts', label: 'Trusted Contacts', icon: '◐' },
  { to: '/documents', label: 'Documents Locator', icon: '▣' },
  { to: '/wasiat', label: 'Wasiat Notes', icon: '✎' },
  { to: '/settings', label: 'Settings & Export', icon: '⚙' }
];

export default function Layout({ children }: { children: ReactNode }) {
  const { lockVault } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-vault-bg">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-vault-border bg-vault-surface p-4">
        <SidebarContent onNavigate={() => {}} onLock={lockVault} />
      </aside>

      {/* Sidebar - mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-vault-surface border-r border-vault-border p-4">
            <SidebarContent onNavigate={() => setMobileOpen(false)} onLock={lockVault} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-vault-border bg-vault-surface">
          <button onClick={() => setMobileOpen(true)} className="text-vault-text text-xl">☰</button>
          <span className="font-display text-vault-gold tracking-tight">Estate Vault</span>
          <div className="w-6" />
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate, onLock }: { onNavigate: () => void; onLock: () => void }) {
  return (
    <>
      <div className="mb-8 px-2">
        <div className="font-display text-2xl text-vault-gold tracking-tight">Estate Vault</div>
        <div className="text-xs text-vault-muted mt-1">Amanah · Private directory</div>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-vault-surfaceAlt text-vault-gold'
                  : 'text-vault-muted hover:text-vault-text hover:bg-vault-surfaceAlt'
              }`
            }
          >
            <span className="w-4 text-center">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={onLock}
        className="mt-4 text-sm text-vault-muted hover:text-vault-danger px-3 py-2 text-left"
      >
        🔒 Lock vault
      </button>
    </>
  );
}
