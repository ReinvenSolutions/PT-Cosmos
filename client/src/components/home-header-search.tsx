import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useHomeSearch } from "@/contexts/home-search-context";

export function HomeHeaderSearch({ className }: { className?: string }) {
  const { searchQuery, setSearchQuery } = useHomeSearch();

  return (
    <div className={`relative flex-1 max-w-xl ${className ?? ""}`}>
      <Input
        type="text"
        placeholder="Buscar destinos por nombre o país..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-10 w-full border-2 pl-10 text-sm shadow-sm"
        data-testid="input-search-destinations"
      />
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
  );
}
