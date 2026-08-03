import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Navbar from "@/components/Navbar";
import QuickCreate from "@/components/QuickCreate";
import FeedbackWidget from "@/components/FeedbackWidget";
import AppShell from "@/components/AppShell";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Vaqen Beta",
  description: "Gerenciamento de clientes, projetos e tarefas com foco no trabalho de hoje.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=4", sizes: "any" },
      { url: "/favicon.svg?v=4", type: "image/svg+xml" },
      { url: "/favicon-32x32.png?v=4", type: "image/png", sizes: "32x32" },
      { url: "/favicon-192x192.png?v=4", type: "image/png", sizes: "192x192" },
    ],
    shortcut: ["/favicon.ico?v=4"],
    apple: [{ url: "/apple-touch-icon.png?v=4", type: "image/png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico?v=4" sizes="any" />
        <link rel="icon" href="/favicon.svg?v=4" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32x32.png?v=4" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4" />
        <link rel="manifest" href="/site.webmanifest?v=4" />
        <meta name="theme-color" content="#5c46ff" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem("vaqen:theme");
                if (theme === "dark") {
                  document.documentElement.classList.add("dark");
                  document.documentElement.style.colorScheme = "dark";
                } else {
                  document.documentElement.classList.remove("dark");
                  document.documentElement.style.colorScheme = "light";
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="antialiased bg-slate-50 text-slate-900">
        <ConfirmProvider>
          <Navbar />
        <QuickCreate />
        <Suspense fallback={null}>
          <FeedbackWidget />
        </Suspense>
        <AppShell>{children}</AppShell>
          <Analytics />
        </ConfirmProvider>
      </body>
    </html>
  );
}





