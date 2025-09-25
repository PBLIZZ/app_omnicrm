// ===== 5. USAGE IN LAYOUT (app/layout.tsx) =====

import { GlobalSearchProvider } from "@/contexts/GlobalSearchContext";
import { GlobalSearchModal } from "@/components/GlobalSearchModal";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GlobalSearchProvider>
          {children}
          <GlobalSearchModal />
        </GlobalSearchProvider>
      </body>
    </html>
  );
}

// ===== 6. TRIGGER SEARCH FROM ANYWHERE (example component) =====

import { useGlobalSearch } from "@/contexts/GlobalSearchContext";

export function Header() {
  const { openSearch } = useGlobalSearch();

  return (
    <header className="flex items-center justify-between p-4">
      <h1>Wellness App</h1>
      <button
        onClick={openSearch}
        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
        <span>Search anything...</span>
        <kbd className="text-xs bg-gray-200 px-1 rounded">⌘K</kbd>
      </button>
    </header>
  );
}
