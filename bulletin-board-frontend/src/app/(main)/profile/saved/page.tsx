"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SavedListingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/saved");
  }, [router]);

  return null;
}
