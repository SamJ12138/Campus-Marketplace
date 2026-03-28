"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function LoginRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectParam = searchParams.get("redirect");

  useEffect(() => {
    const target = redirectParam
      ? `/register?redirect=${encodeURIComponent(redirectParam)}`
      : "/register";
    router.replace(target);
  }, [redirectParam, router]);

  return null;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginRedirect />
    </Suspense>
  );
}
