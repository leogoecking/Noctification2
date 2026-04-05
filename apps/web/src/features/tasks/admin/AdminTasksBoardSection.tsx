import type { KeyboardEvent } from "react";
import type { TaskItem } from "../../../types";
import { buildTaskSlaInfo } from "../../../components/tasks/taskUi";
import { TaskBoard } from "../../../components/tasks/TaskBoard";
import { buildAdminTaskBoardColumns } from "./adminTasksPanelModel";

interface AdminTasksBoardSectionProps {
  boardColumns: ReturnType<typeof buildAdminTaskBoardColumns>;
  loading: boolean;
  searchFilter: string;
  setSearchFilter: (value: string) => void;
  selectedTaskId: number | null;
  onBoardCardKeyDown: (event: KeyboardEvent<HTMLDivElement>, task: TaskItem) => void;
  onOpenTask: (task: TaskItem) => void;
  onRefresh: () => void;
  onCompleteTask: (taskId: number) => void;
  onUpdateStatus: (
    taskId: number,
    status: "new" | "assumed" | "in_progress" | "blocked" | "waiting_external"
  ) => void;
  selectedTaskIds: number[];
  onToggleTask: (taskId: number) => void;
  onOpenCreateTask: () => void;
}

export const AdminTasksBoardSection = ({
  boardColumns,
  loading,
  searchFilter,
  setSearchFilter,
  selectedTaskId,
  onBoardCardKeyDown,
  onOpenTask,
  onRefresh,
  onCompleteTask,
  onUpdateStatus,
  selectedTaskIds,
  onToggleTask,
  onOpenCreateTask
}: AdminTasksBoardSectionProps) => (
  <>
    <div className="space-y-4">
      <TaskBoard
        boardColumns={boardColumns}
        emptyMessage="Nenhuma tarefa encontrada para a busca atual."
        filters={
          <div className="flex flex-1">
            <input
              className="input min-w-36"
              placeholder="titulo, descricao, responsavel ou status"
              value={searchFilter}
              onChange={(event) => setSearchFilter(event.target.value)}
            />
          </div>
        }
        headerDescription="Kanban principal da operacao com busca direta e SLA"
        headerEyebrow="Board"
        headerTitle="Kanban"
        loading={loading}
        metaRowRenderer={(task) => (
          <>
            <span
              className={`rounded-full px-2 py-1 text-xs ${buildTaskSlaInfo(task).badgeClassName}`}
              title={buildTaskSlaInfo(task).detail}
            >
              {buildTaskSlaInfo(task).label}
            </span>
            <span>{task.assigneeName || "Sem responsavel"}</span>
            <span>{task.dueAt ? new Date(task.dueAt).toLocaleString("pt-BR") : "Sem prazo"}</span>
          </>
        )}
        selectedTaskId={selectedTaskId}
        onBoardCardKeyDown={onBoardCardKeyDown}
        onOpenTask={onOpenTask}
        onRefresh={onRefresh}
        onCompleteTask={onCompleteTask}
        onUpdateStatus={(taskId, status) => onUpdateStatus(taskId, status)}
        showHeaderMetaBadge={false}
        bulkSelection={{
          selectedTaskIds,
          onToggleTask
        }}
      />
    </div>

    <div className="fixed bottom-8 right-8 z-20">
      <button
        aria-label="Nova tarefa"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-sm transition hover:scale-[1.02]"
        onClick={onOpenCreateTask}
        type="button"
      >
        <span aria-hidden="true" className="text-2xl leading-none">+</span>
      </button>
    </div>
  </>
);
