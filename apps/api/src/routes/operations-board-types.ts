export type MuralCategory =
  | "urgente"
  | "info"
  | "aviso"
  | "comunicado"
  | "procedimento"
  | "geral";

export type BoardMessageRow = {
  id: number;
  title: string;
  body: string;
  status: "active" | "resolved";
  category: MuralCategory;
  authorUserId: number;
  authorName: string;
  authorLogin: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type BoardEventType =
  | "created"
  | "updated"
  | "commented"
  | "resolved"
  | "reopened"
  | "viewed";

export type BoardEventRow = {
  id: number;
  messageId: number;
  actorUserId: number;
  actorName: string;
  actorLogin: string;
  eventType: BoardEventType;
  body: string | null;
  metadataJson: string | null;
  createdAt: string;
};

export interface BoardViewedResult {
  recorded: boolean;
  actorUserId: number;
  actorName: string;
  actorLogin: string;
  viewedAt: string;
}

export const VALID_CATEGORIES: MuralCategory[] = [
  "urgente",
  "info",
  "aviso",
  "comunicado",
  "procedimento",
  "geral"
];
