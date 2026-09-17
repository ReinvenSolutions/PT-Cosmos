import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { COSMOS_CATALOG_SEARCH_EVENT } from "@/lib/cosmos-actions";

interface HomeSearchContextValue {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const HomeSearchContext = createContext<HomeSearchContextValue | null>(null);

export function HomeSearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const onSearch = (event: Event) => {
      const query = (event as CustomEvent<{ query?: string }>).detail?.query;
      if (typeof query === "string") setSearchQuery(query);
    };
    window.addEventListener(COSMOS_CATALOG_SEARCH_EVENT, onSearch);
    return () => window.removeEventListener(COSMOS_CATALOG_SEARCH_EVENT, onSearch);
  }, []);

  return (
    <HomeSearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      {children}
    </HomeSearchContext.Provider>
  );
}

export function useHomeSearch() {
  const ctx = useContext(HomeSearchContext);
  if (!ctx) {
    throw new Error("useHomeSearch must be used within HomeSearchProvider");
  }
  return ctx;
}
