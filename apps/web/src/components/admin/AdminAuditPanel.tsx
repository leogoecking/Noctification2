import { useMemo, useState } from "react";
import type { AuditFilters, StateSetter } from "./types";
import {
  formatAuditEventType,
  getAuditCategory
} from "./utils";
import { AdminAuditFilters } from "./AdminAuditFilters";
import { AdminAuditList } from "./AdminAuditList";
import type { AuditEventItem, PaginationInfo } from "../../types";

interface AdminAuditPanelProps {
  auditFilters: AuditFilters;
  setAuditFilters: StateSetter<AuditFilters>;
  auditEventTypes: string[];
  lastAuditRefreshAt: string | null;
  auditPagination: PaginationInfo;
  setAuditPagination: StateSetter<PaginationInfo>;
  loadingAudit: boolean;
  auditEvents: AuditEventItem[];
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onRefresh: () => void;
}

export const AdminAuditPanel = ({
  auditFilters,
  setAuditFilters,
  auditEventTypes,
  lastAuditRefreshAt,
  auditPagination,
  setAuditPagination,
  loadingAudit,
  auditEvents,
  onApplyFilters,
  onResetFilters,
  onRefresh
}: AdminAuditPanelProps) => {
  const [categoryFilter, setCategoryFilter] = useState("all");

  const availableCategories = useMemo(() => {
    const categories = new Map<string, ReturnType<typeof getAuditCategory>>();
    for (const eventType of auditEventTypes) {
      const category = getAuditCategory(eventType);
      categories.set(category.label, category);
    }

    for (const event of auditEvents) {
      const category = getAuditCategory(event.event_type);
      categories.set(category.label, category);
    }

    return Array.from(categories.values());
  }, [auditEventTypes, auditEvents]);

  const filteredAuditEvents = useMemo(() => {
    if (categoryFilter === "all") {
      return auditEvents;
    }

    return auditEvents.filter((event) => getAuditCategory(event.event_type).label === categoryFilter);
  }, [auditEvents, categoryFilter]);

  const auditEventSuggestions = useMemo(() => {
    return [...auditEventTypes]
      .sort((left, right) =>
        formatAuditEventType(left).localeCompare(formatAuditEventType(right), "pt-BR")
      )
      .slice(0, 8);
  }, [auditEventTypes]);

  const selectedEventTypeLabel = useMemo(() => {
    const trimmed = auditFilters.eventType.trim();
    return trimmed ? formatAuditEventType(trimmed) : null;
  }, [auditFilters.eventType]);

  return (
    <article className="space-y-4 rounded-[1.25rem] bg-panel p-5">
      <AdminAuditFilters
        auditFilters={auditFilters}
        setAuditFilters={setAuditFilters}
        auditEventTypes={auditEventTypes}
        auditEventSuggestions={auditEventSuggestions}
        selectedEventTypeLabel={selectedEventTypeLabel}
        lastAuditRefreshAt={lastAuditRefreshAt}
        auditPagination={auditPagination}
        setAuditPagination={setAuditPagination}
        onApplyFilters={onApplyFilters}
        onResetFilters={onResetFilters}
        onRefresh={onRefresh}
      />

      <AdminAuditList
        loadingAudit={loadingAudit}
        filteredAuditEvents={filteredAuditEvents}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        availableCategories={availableCategories}
      />
    </article>
  );
};
