import ClientShell from '@/components/ui/ClientShell';
import { Suspense } from 'react';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientShell><Suspense>{children}</Suspense></ClientShell>;
}
