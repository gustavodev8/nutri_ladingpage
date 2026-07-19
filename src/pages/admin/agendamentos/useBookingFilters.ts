import { useMemo, useState } from "react";
import type { FilterTab } from "./bookingStatusUtils";

export type BookingTypeFilter = "all" | "online" | "presencial";

export const useBookingFilters = () => {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<BookingTypeFilter>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterPlan, setFilterPlan] = useState("");

  const activeFilterCount = useMemo(
    () => [filterType !== "all", Boolean(filterDateFrom), Boolean(filterDateTo), Boolean(filterPlan)].filter(Boolean).length,
    [filterDateFrom, filterDateTo, filterPlan, filterType],
  );

  const clearAdvancedFilters = () => {
    setFilterType("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterPlan("");
  };

  return {
    filter,
    setFilter,
    search,
    setSearch,
    showFilters,
    setShowFilters,
    filterType,
    setFilterType,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    filterPlan,
    setFilterPlan,
    activeFilterCount,
    clearAdvancedFilters,
  };
};

export type BookingFiltersState = ReturnType<typeof useBookingFilters>;
