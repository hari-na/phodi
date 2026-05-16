"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { loadProfile } from "@/lib/player";

/**
 * Client-side gate. If no player profile exists, sends the user to
 * /onboarding. Skips itself when the user is already on /onboarding.
 *
 * Wraps any page that should require onboarding to have completed.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith("/onboarding")) return;
    const profile = loadProfile();
    if (!profile) router.replace("/onboarding");
  }, [pathname, router]);

  return <>{children}</>;
}
