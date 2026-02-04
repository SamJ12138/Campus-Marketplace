import { en as t } from "@/lib/i18n/en";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            {t.common.appName}
          </h1>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
