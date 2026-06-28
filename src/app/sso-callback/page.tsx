"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MandalaLoader } from "@/components/ui/mandala-loader";
import { useAuth } from "@/hooks/useAuth";

export default function SSOCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isSignedIn) {
        const redirectUrl = searchParams.get("redirect_url") || "/";
        router.push(redirectUrl);
      } else {
        // Fallback if not signed in after loading
        const timer = setTimeout(() => {
          router.push("/sign-in");
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isSignedIn, isLoading, router, searchParams]);

  return (
    <div className="flex-1 w-full bg-background min-h-screen flex flex-col items-center justify-center">
      <MandalaLoader size={48} />
      <p className="mt-4 text-xs text-primary/70 tracking-widest uppercase animate-pulse">Completing Sign In...</p>
    </div>
  );
}
