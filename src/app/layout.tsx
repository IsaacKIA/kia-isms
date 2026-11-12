import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KIA-ISMS | KIA-Start Up Consult — International Services Management System',
  description:
    'Integrated international recruitment, study abroad, visa assistance, flight booking, and double-entry financial management system for KIA-Start Up Consult (Ghana).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900" suppressHydrationWarning>{children}</body>
    </html>
  );
}
