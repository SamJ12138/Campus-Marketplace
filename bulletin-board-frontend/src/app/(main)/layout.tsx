"use client";

import { Suspense, useEffect } from "react";
import { useAuthStore } from "@/lib/hooks/use-auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { SupportChat } from "@/components/chat/SupportChat";
import { ReportModal } from "@/components/modals/ReportModal";

function AuthInit({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Render children immediately — don't block the whole page on auth.
  // Protected pages handle their own loading state via <ProtectedPage>.
  return <>{children}</>;
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthInit>
      <div className="flex min-h-screen flex-col bg-mesh">
        <Suspense>
          <Header />
        </Suspense>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-6">
          {children}
        </main>
        <Footer />
        <MobileNav />
        <SupportChat />
        <ReportModal />
      </div>
    </AuthInit>
  );
}
