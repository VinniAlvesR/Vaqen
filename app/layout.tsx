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
    icon: [{ url: "/vaqen-icon.svg?v=5", type: "image/svg+xml" }],
    shortcut: ["/vaqen-icon.svg?v=5"],
    apple: [{ url: "/vaqen-icon.svg?v=5", type: "image/svg+xml" }],
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
        <link rel="icon" href="/vaqen-icon.svg?v=5" type="image/svg+xml" />
        <link rel="shortcut icon" href="/vaqen-icon.svg?v=5" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/vaqen-icon.svg?v=5" />
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






