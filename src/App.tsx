import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import VaultSetup from './pages/VaultSetup';
import VaultUnlock from './pages/VaultUnlock';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Investments from './pages/Investments';
import Insurance from './pages/Insurance';
import Contacts from './pages/Contacts';
import DocumentsLocator from './pages/DocumentsLocator';
import Wasiat from './pages/Wasiat';
import Settings from './pages/Settings';

function Gate({ children }: { children: React.ReactNode }) {
  const { user, loading, hasSetUpVault, vaultUnlocked } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-vault-muted">
        Loading Estate Vault…
      </div>
    );
  }
  if (!user) return <Login />;
  if (!hasSetUpVault) return <VaultSetup />;
  if (!vaultUnlocked) return <VaultUnlock />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Gate>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/insurance" element={<Insurance />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/documents" element={<DocumentsLocator />} />
              <Route path="/wasiat" element={<Wasiat />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Gate>
      </HashRouter>
    </AuthProvider>
  );
}
