"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPin, Check, ChevronsUpDown, Search } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { rpc } from "@/lib/rpc";
import { setCookie } from "@/lib/cookies";
import { cn } from "@/lib/utils";

export interface CityItem {
  id: string;
  name: string;
  state?: string;
  slug?: string;
}

const DEFAULT_CITIES: CityItem[] = [
  { id: "city_raipur", name: "Raipur", state: "Chhattisgarh", slug: "raipur" },
  { id: "city_bhilai", name: "Bhilai", state: "Chhattisgarh", slug: "bhilai" },
  { id: "city_bilaspur", name: "Bilaspur", state: "Chhattisgarh", slug: "bilaspur" },
  { id: "city_durg", name: "Durg", state: "Chhattisgarh", slug: "durg" },
  { id: "city_korba", name: "Korba", state: "Chhattisgarh", slug: "korba" },
  { id: "city_rajnandgaon", name: "Rajnandgaon", state: "Chhattisgarh", slug: "rajnandgaon" },
];

export interface CitySelectorProps {
  currentCityId?: string | null;
  currentCityName?: string | null;
  isLoggedIn?: boolean;
  cities?: CityItem[];
  className?: string;
}

export function CitySelector({
  currentCityId,
  currentCityName,
  isLoggedIn = false,
  cities = DEFAULT_CITIES,
  className,
}: CitySelectorProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [pendingCity, setPendingCity] = React.useState<CityItem | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  // For logged out: check browsing_city cookie on mount
  const [browsingCity, setBrowsingCity] = React.useState<string | null>(() => {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/browsing_city=([^;]+)/);
      return match ? match[1] : null;
    }
    return null;
  });

  const activeCity = React.useMemo(() => {
    if (isLoggedIn && (currentCityId || currentCityName)) {
      return (
        cities.find((c) => c.id === currentCityId || c.name === currentCityName) || {
          id: currentCityId || "custom",
          name: currentCityName || "Raipur",
        }
      );
    }
    if (browsingCity) {
      return cities.find((c) => c.id === browsingCity || c.slug === browsingCity);
    }
    return null;
  }, [isLoggedIn, currentCityId, currentCityName, browsingCity, cities]);

  const filteredCities = React.useMemo(() => {
    if (!query) return cities;
    const lower = query.toLowerCase();
    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        (c.state && c.state.toLowerCase().includes(lower))
    );
  }, [cities, query]);

  const handleSelectCity = (city: CityItem | null) => {
    setOpen(false);

    if (!isLoggedIn) {
      // Store in browsing cookie
      if (city) {
        setCookie("browsing_city", city.id);
        setBrowsingCity(city.id);
      } else {
        setCookie("browsing_city", "", -1);
        setBrowsingCity(null);
      }
      router.refresh();
      return;
    }

    // Logged in user: prompt confirmation to switch profile city
    if (city && city.id !== activeCity?.id) {
      setPendingCity(city);
      setConfirmOpen(true);
    }
  };

  const handleConfirmCityChange = async () => {
    if (!pendingCity) return;
    setIsUpdating(true);

    try {
      // Call change_city RPC
      const res = await rpc("change_city", {
        p_city_id: pendingCity.id,
      });

      if (res.error) {
        toast({
          title: "Could not update city",
          description: res.error.message,
          variant: "danger",
        });
      } else {
        toast({
          title: "City updated.",
          description: `Switched your profile city to ${pendingCity.name}.`,
          variant: "success",
        });
        router.refresh();
      }
    } finally {
      setIsUpdating(false);
      setPendingCity(null);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-pill border border-line bg-card px-3 py-1 text-xs sm:text-sm font-semibold text-ink transition-colors hover:bg-surface select-none",
              "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
              className
            )}
            aria-label="Select city"
          >
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate max-w-[120px]">
              {activeCity ? activeCity.name : "All cities"}
            </span>
            <ChevronsUpDown className="h-3 w-3 text-muted shrink-0 opacity-60" />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            className="z-50 w-64 rounded-card border border-line bg-card p-1.5 text-ink shadow-lg outline-none"
          >
            <div className="flex items-center gap-2 border-b border-line px-2.5 py-1.5 mb-1">
              <Search className="h-3.5 w-3.5 text-muted shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city..."
                className="w-full bg-transparent text-xs text-ink placeholder:text-muted outline-none"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto">
              {!isLoggedIn && (
                <button
                  type="button"
                  onClick={() => handleSelectCity(null)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-xs font-medium transition-colors hover:bg-surface text-left",
                    !activeCity && "font-bold text-primary"
                  )}
                >
                  <span>All cities</span>
                  {!activeCity && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              )}

              {filteredCities.map((city) => {
                const isSelected = activeCity?.id === city.id;
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleSelectCity(city)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-xs font-medium transition-colors hover:bg-surface text-left",
                      isSelected && "font-bold text-primary"
                    )}
                  >
                    <div className="flex flex-col">
                      <span>{city.name}</span>
                      {city.state && (
                        <span className="text-[10px] text-muted">
                          {city.state}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {/* Confirmation Dialog for Logged-In Users */}
      {pendingCity && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Switch city to ${pendingCity.name}?`}
          description={`You'll be able to apply to tournaments in ${pendingCity.name}. Your existing registrations stay as they are.`}
          confirmLabel={`Switch to ${pendingCity.name}`}
          loading={isUpdating}
          onConfirm={handleConfirmCityChange}
        />
      )}
    </>
  );
}
