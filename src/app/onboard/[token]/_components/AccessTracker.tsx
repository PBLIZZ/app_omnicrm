"use client";

import { useEffect } from "react";

interface AccessTrackerProps {
  token: string;
}

export function AccessTracker({ token }: AccessTrackerProps) {
  useEffect(() => {
    // Track access when component mounts (page loads)
    const trackAccess = async () => {
      try {
        await fetch("/api/onboarding/public/track-access", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });
      } catch (error) {
        // Silently fail - don't interrupt user experience
        console.warn("Failed to track access:", error);
      }
    };

    trackAccess();
  }, [token]);

  return null; // This component doesn't render anything
}
