import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '../lib/auth';

export const metadata: Metadata = {
  title: 'Digital Budget & Pantry',
  description: 'A digital budgeting tool with an inbuilt calculator and a food lifespan planning calendar.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="bg-[#080808] text-white font-sans min-h-[1024px]" style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }} suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
