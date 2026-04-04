import type {
  parseReminderColor,
  parseReminderChecklistItems,
  parseReminderNoteKind,
  parseReminderRepeatType
} from "./service";

export type ParsedReminderRepeatType = Exclude<ReturnType<typeof parseReminderRepeatType>, null>;
export type ParsedReminderNoteKind = Exclude<ReturnType<typeof parseReminderNoteKind>, null>;
export type ParsedReminderColor = Exclude<ReturnType<typeof parseReminderColor>, null>;

export interface ReminderCurrentSchedule {
  title: string;
  description: string;
  startDate: string;
  timeOfDay: string;
  timezone: string;
  repeatType: string;
  weekdaysJson: string;
  checklistJson: string;
  noteKind: ParsedReminderNoteKind;
  isPinned: boolean | number;
  tag: string;
  color: ParsedReminderColor;
  lastScheduledFor: string | null;
}

export interface ParsedReminderCreateInput {
  title: string | null;
  description: string;
  startDate: string | null;
  timeOfDay: string | null;
  timezone: string;
  repeatType: ReturnType<typeof parseReminderRepeatType>;
  weekdays: number[];
  checklistItems: ReturnType<typeof parseReminderChecklistItems>;
  noteKind: ReturnType<typeof parseReminderNoteKind>;
  isPinned: boolean;
  tag: string;
  color: ReturnType<typeof parseReminderColor>;
}

export interface ParsedReminderUpdateInput {
  title: string | null;
  description: string | null;
  startDate: string | null;
  timeOfDay: string | null;
  timezone: string | null;
  repeatTypeRaw: unknown;
  repeatType: ReturnType<typeof parseReminderRepeatType> | undefined;
  weekdays: number[] | undefined;
  checklistItems: ReturnType<typeof parseReminderChecklistItems> | undefined;
  noteKindRaw: unknown;
  noteKind: ReturnType<typeof parseReminderNoteKind> | undefined;
  isPinned: boolean | undefined;
  tag: string | undefined;
  colorRaw: unknown;
  color: ReturnType<typeof parseReminderColor> | undefined;
}

export interface ResolvedReminderWrite {
  title: string;
  description: string;
  startDate: string;
  timeOfDay: string;
  timezone: string;
  repeatType: ParsedReminderRepeatType;
  weekdays: number[];
  weekdaysJson: string;
  checklistItems: ReturnType<typeof parseReminderChecklistItems>;
  checklistJson: string;
  noteKind: ParsedReminderNoteKind;
  isPinned: boolean;
  tag: string;
  color: ParsedReminderColor;
  lastScheduledFor: string | null;
}
