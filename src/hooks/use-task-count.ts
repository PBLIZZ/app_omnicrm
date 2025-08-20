"use client";

import { useState, useEffect } from "react";

export function useTaskCount(): number {
  const [count] = useState(12); // Placeholder - would fetch from tasks API

  useEffect(() => {
    // TODO: Implement when tasks API is available
    // For now, using hardcoded value matching current display
  }, []);

  return count;
}
