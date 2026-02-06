"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * Deep-link redirect: /messages/:threadId → /messages?thread=:threadId
 * The unified messages page handles all conversation display.
 */
export default function ThreadRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const threadId = params.threadId as string;

  useEffect(() => {
    router.replace(`/messages?thread=${threadId}`);
  }, [threadId, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
