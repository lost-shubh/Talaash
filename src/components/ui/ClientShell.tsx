'use client';
import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import { Topbar } from '@/components/ui/Topbar';
import { Footer } from '@/components/ui/Footer';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <Topbar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
        <Footer />
      </ToastProvider>
    </AuthProvider>
  );
}
