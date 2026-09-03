import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MPLAD-Watch | LokNidhi AI Vigilance Workstation (MoSPI, GoI)',
  description:
    'Ministry of Statistics and Programme Implementation - Autonomous Monitoring, Fraud-Detection and Analytics Workstation for MPLADS Works',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-paper text-text-main selection:bg-slate-200">
        {children}
      </body>
    </html>
  );
}
