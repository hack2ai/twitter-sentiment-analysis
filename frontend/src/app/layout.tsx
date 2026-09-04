import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Twitter Sentiment AI",
  description: "Modern AI-powered sentiment analysis for social media text and datasets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg shadow-slate-900/10 backdrop-blur sm:right-6 sm:top-5">
          <Link
            href="/login"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-indigo-700"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            Create account
          </Link>
        </div>
        {children}
      </body>
    </html>
  );
}
