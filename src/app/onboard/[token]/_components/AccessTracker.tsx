"use client";

import { useEffect, useRef } from "react";

interface AccessTrackerProps {
  token: string;
}

// Module-level flag to prevent duplicate tracking across all instances
let hasTrackedAccess = false;

export function AccessTracker({ token }: AccessTrackerProps) {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate tracking within the same component instance
    if (hasTrackedRef.current) {
      return;
    }

    // Prevent duplicate tracking across all instances
    if (hasTrackedAccess) {
      return;
    }

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

        // Mark as tracked on successful request
        hasTrackedAccess = true;
        hasTrackedRef.current = true;
      } catch (error) {
        // Silently fail - don't interrupt user experience
        console.warn("Failed to track access:", error);
        // Still mark as attempted to prevent retries
        hasTrackedRef.current = true;
      }
    };

    trackAccess();
  }, [token]);

  return null; // This component doesn't render anything
}
