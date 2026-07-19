import { Search, SlidersHorizontal, X } from "lucide-react";
import type { Booking } from "@/lib/supabase";
import { BOOKING_TABS, type FilterTab } from "./bookingStatusUtils";
import type { BookingFiltersState } from "./useBookingFilters";

interface BookingFiltersBarProps {
  filters: BookingFiltersState;
  bookings: Booking[];
  counts: Record<FilterTab, number>;
}

export const BookingFiltersBar = ({
  filters,
  bookings,
  counts,
}: BookingFiltersBarProps) => {
  const planNames = [...new Set(bookings.map(booking => booking.plan_name).filter(Boolean))].sort();

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              value={filters.search}
              onChange={event => filters.setSearch(event.target.value)}
              placeholder="Buscar paciente, plano, email..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40"
            />
          </div>
          <button
            onClick={() => filters.setShowFilters(previous => !previous)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
              filters.showFilters || filters.activeFilterCount > 0
                ? "border-primary/50 bg-primary/5 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/30"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {filters.activeFilterCount > 0 && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {filters.activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {filters.showFilters && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Modalidade</label>
                <div className="flex gap-1.5">
                  {(["all", "online", "presencial"] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => filters.setFilterType(type)}
                      className={`flex-1 px-2 py-1.5 rounded-md border text-xs font-medium transition-all ${
                        filters.filterType === type
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {type === "all" ? "Todos" : type === "online" ? "Online" : "Presencial"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Data de</label>
                <input
                  type="date"
                  value={filters.filterDateFrom}
                  onChange={event => filters.setFilterDateFrom(event.target.value)}
                  className="w-full h-8 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Data até</label>
                <input
                  type="date"
                  value={filters.filterDateTo}
                  onChange={event => filters.setFilterDateTo(event.target.value)}
                  className="w-full h-8 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Plano</label>
              <select
                value={filters.filterPlan}
                onChange={event => filters.setFilterPlan(event.target.value)}
                className="w-full h-8 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todos os planos</option>
                {planNames.map(plan => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </select>
            </div>

            {filters.activeFilterCount > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={filters.clearAdvancedFilters}
                  className="text-xs text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-b border-border overflow-x-auto scrollbar-none">
        <div className="flex gap-0 min-w-max">
          {BOOKING_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => filters.setFilter(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-all relative whitespace-nowrap ${
                filters.filter === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${filters.filter === tab.id ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                {counts[tab.id]}
              </span>
              {filters.filter === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
