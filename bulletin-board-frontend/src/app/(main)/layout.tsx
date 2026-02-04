"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/hooks/use-auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { SupportChat } from "@/components/chat/SupportChat";

function AuthInit({ children }: { children: React.ReactNode }) {
  const { isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthInit>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 pb-20 md:pb-6">
          {children}
        </main>
        <Footer />
        <MobileNav />
        <SupportChat />
      </div>
    </AuthInit>
  );
}
