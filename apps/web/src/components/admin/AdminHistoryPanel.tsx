import type { NotificationHistoryItem, UserItem } from "../../types";
import type { PaginationInfo } from "../../types";
import type { HistoryFilters, StateSetter } from "./types";
import { AdminHistoryFilters } from "./AdminHistoryFilters";
import { AdminHistoryList } from "./AdminHistoryList";

interface AdminHistoryPanelProps {
  historyFilters: HistoryFilters;
  setHistoryFilters: StateSetter<HistoryFilters>;
  selectableUserTargets: UserItem[];
  lastHistoryRefreshAt: string | null;
  historyPagination: PaginationInfo;
  setHistoryPagination: StateSetter<PaginationInfo>;
  loadingHistoryAll: boolean;
  historyAll: NotificationHistoryItem[];
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onRefresh: () => void;
}

export const AdminHistoryPanel = ({
  historyFilters,
  setHistoryFilters,
  selectableUserTargets,
  lastHistoryRefreshAt,
  historyPagination,
  setHistoryPagination,
  loadingHistoryAll,
  historyAll,
  onApplyFilters,
  onResetFilters,
  onRefresh
}: AdminHistoryPanelProps) => {
  return (
    <article className="space-y-3 rounded-[1.25rem] bg-panel p-5">
      <AdminHistoryFilters
        historyFilters={historyFilters}
        setHistoryFilters={setHistoryFilters}
        selectableUserTargets={selectableUserTargets}
        lastHistoryRefreshAt={lastHistoryRefreshAt}
        historyPagination={historyPagination}
        setHistoryPagination={setHistoryPagination}
        onApplyFilters={onApplyFilters}
        onResetFilters={onResetFilters}
        onRefresh={onRefresh}
      />

      <AdminHistoryList loadingHistoryAll={loadingHistoryAll} historyAll={historyAll} />
    </article>
  );
};
