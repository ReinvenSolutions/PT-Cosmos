import { createContext, useContext, useState, type ReactNode } from "react";

interface HomeSearchContextValue {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const HomeSearchContext = createContext<HomeSearchContextValue | null>(null);

export function HomeSearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");

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
