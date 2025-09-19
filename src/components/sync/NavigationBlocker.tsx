"use client";

import { useEffect } from "react";

interface NavigationBlockerProps {
  message?: string;
}

export function NavigationBlocker({
  message = "Sync is in progress. Leaving this page may interrupt the operation.",
}: NavigationBlockerProps) {
  useEffect(() => {
    // Block browser navigation (back/forward/refresh/close)
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    // Add the event listener
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Block programmatic navigation in Next.js
    // Note: This is a simplified approach. For more robust navigation blocking,
    // you might want to use a router event listener or state management.
    const handlePopState = () => {
      if (!window.confirm(message)) {
        // Push the current state back to prevent navigation
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [message]);

  return null; // This component doesn't render anything
}