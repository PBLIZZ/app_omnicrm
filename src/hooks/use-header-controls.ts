"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";

interface HeaderControls {
  mounted: boolean;
  theme: string | undefined;
  setTheme: (theme: string) => void;
  notificationCount: number;
  isSearchOpen: boolean;
  setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleSearch: () => void;
}

export function useHeaderControls(): HeaderControls {
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [notificationCount] = useState(3);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearchShortcut = useCallback((event: KeyboardEvent): void => {
    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
      event.preventDefault();
      setIsSearchOpen(true);
    }
  }, []);

  const handleSearch = (): void => setIsSearchOpen(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleSearchShortcut);
    return () => document.removeEventListener("keydown", handleSearchShortcut);
  }, [handleSearchShortcut]);

  return {
    mounted,
    theme,
    setTheme,
    notificationCount,
    isSearchOpen,
    setIsSearchOpen,
    handleSearch,
  };
}
