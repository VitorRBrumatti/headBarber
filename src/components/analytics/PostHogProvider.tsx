"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

let posthogInitialized = false;

function ensurePostHogInitialized(): boolean {
  if (process.env.NODE_ENV !== "production" || typeof window === "undefined") {
    return false;
  }

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return false;

  if (!posthogInitialized) {
    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
    try {
      posthog.init(key, {
        api_host: host,
        capture_pageview: false,
        capture_pageleave: true,
      });
      posthogInitialized = true;
    } catch {
      return false;
    }
  }

  return true;
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    if (!ensurePostHogInitialized()) return;

    const query = searchParams?.toString();
    const url = query
      ? `${window.location.origin}${pathname}?${query}`
      : `${window.location.origin}${pathname}`;

    try {
      posthog.capture("$pageview", { $current_url: url });
    } catch {
      // Fail silently when analytics cannot capture.
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensurePostHogInitialized();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}
