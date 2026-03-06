import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Talaash — Missing Person Registry',
  description: 'India\'s open-source missing persons registry. Search, report, and help find missing persons across India.',
  keywords: 'missing persons, India, talaash, search, registry',
  openGraph: {
    title: 'Talaash — Missing Person Registry',
    description: 'India\'s open-source missing persons registry.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
