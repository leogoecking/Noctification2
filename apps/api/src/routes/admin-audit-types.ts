export interface AuditRow {
  id: number;
  eventType: string;
  targetType: string;
  targetId: number | null;
  metadataJson: string | null;
  createdAt: string;
  actorUserId: number | null;
  actorName: string | null;
  actorLogin: string | null;
}
