import { useState } from "react";
import type { ReminderItem } from "../../types";
import {
  buildSearchableTags,
  formatAlarmBadge,
  formatShortDate,
  getNotePalette,
  getReminderDisplayBody,
  mapReminderColorToUi,
  type NoteUiColor
} from "./reminderNoteUi";
import type { ReminderViewModel } from "./reminderUi";

export interface ReminderCardProps {
  darkMode: boolean;
  entry: ReminderViewModel;
  onEdit: (item: ReminderItem) => void;
  onPin: (item: ReminderItem) => void;
  onToggleChecklistItem: (item: ReminderItem, itemIndex: number) => void;
}

const ReminderCheckItem = ({
  checked,
  color,
  darkMode,
  label,
  onToggle
}: {
  checked: boolean;
  color: NoteUiColor;
  darkMode: boolean;
  label: string;
  onToggle: () => void;
}) => {
  const palette = getNotePalette(color, darkMode);

  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        marginTop: 5,
        cursor: "pointer"
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          flexShrink: 0,
          border: `1.5px solid ${checked ? palette.dot : palette.buttonBorder}`,
          background: checked ? palette.dot : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {checked ? <span style={{ fontSize: 9, fontWeight: 700, color: "#ffffff" }}>✓</span> : null}
      </div>
      <span
        style={{
          fontSize: 12,
          color: palette.text,
          opacity: checked ? 0.5 : 0.82,
          textDecoration: checked ? "line-through" : "none",
          lineHeight: 1.4
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const ReminderGridCard = ({
  darkMode,
  entry,
  onEdit,
  onPin,
  onToggleChecklistItem
}: ReminderCardProps) => {
  const [hovered, setHovered] = useState(false);
  const color = mapReminderColorToUi(entry.meta.color);
  const palette = getNotePalette(color, darkMode);
  const tags = buildSearchableTags(entry);
  const displayBody = getReminderDisplayBody(entry);

  return (
    <div
      onClick={() => onEdit(entry.item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 14,
        padding: "13px 13px 10px",
        position: "relative",
        transform: hovered ? "translateY(-3px) scale(1.01)" : "translateY(0) scale(1)",
        transition: "transform .18s ease",
        cursor: "pointer"
      }}
      tabIndex={0}
    >
      <button
        aria-label={entry.meta.pinned ? "Desafixar" : "Fixar"}
        onClick={(event) => {
          event.stopPropagation();
          onPin(entry.item);
        }}
        style={{
          position: "absolute",
          top: 8,
          right: 9,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          opacity: entry.meta.pinned ? 0.9 : hovered ? 0.45 : 0.18,
          transition: "opacity .15s",
          padding: 2
        }}
        title={entry.meta.pinned ? "Desafixar" : "Fixar"}
        type="button"
      >
        📌
      </button>

      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: palette.text,
          marginBottom: 4,
          lineHeight: 1.35,
          paddingRight: 18
        }}
      >
        {entry.item.title}
      </div>

      {displayBody ? (
        <div
          style={{
            fontSize: 12,
            color: palette.text,
            opacity: 0.78,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap"
          }}
        >
          {displayBody}
        </div>
      ) : null}

      {entry.checklistItems.length > 0 ? (
        <>
          {entry.checklistItems.map((item, index) => (
            <ReminderCheckItem
              checked={item.checked}
              color={color}
              darkMode={darkMode}
              key={`${entry.item.id}-task-${index}`}
              label={item.label}
              onToggle={() => onToggleChecklistItem(entry.item, index)}
            />
          ))}
          <div style={{ fontSize: 10, color: palette.muted, marginTop: 6 }}>
            {entry.checklistCompleted} de {entry.checklistTotal} feitos
          </div>
        </>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginTop: 10,
          flexWrap: "wrap"
        }}
      >
        {tags.map((tag) => (
          <span
            key={`${entry.item.id}-${tag}`}
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: "2px 7px",
              borderRadius: 10,
              background: palette.chipBg,
              color: palette.chipText
            }}
          >
            {tag}
          </span>
        ))}
        {entry.meta.noteKind === "alarm" ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: "2px 7px",
              borderRadius: 10,
              background: palette.chipBg,
              color: palette.chipText
            }}
          >
            ⏰ {formatAlarmBadge(entry.item)}
          </span>
        ) : null}
        <span style={{ fontSize: 10, color: palette.muted, marginLeft: "auto" }}>
          {formatShortDate(entry.item.startDate)}
        </span>
      </div>
    </div>
  );
};

export const ReminderListItem = ({
  darkMode,
  entry,
  onEdit,
  onPin
}: Pick<ReminderCardProps, "darkMode" | "entry" | "onEdit" | "onPin">) => {
  const [hovered, setHovered] = useState(false);
  const color = mapReminderColorToUi(entry.meta.color);
  const palette = getNotePalette(color, darkMode);
  const preview =
    getReminderDisplayBody(entry) || entry.checklistItems.map((item) => item.label).join(" · ") || "—";
  const tags = buildSearchableTags(entry);

  return (
    <div
      onClick={() => onEdit(entry.item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 14,
        background: hovered ? "rgb(var(--color-panel-alt) / 1)" : "transparent",
        transition: "background .12s",
        cursor: "pointer"
      }}
      tabIndex={0}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: palette.dot,
          flexShrink: 0,
          marginTop: 5
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
          {entry.meta.pinned ? <span style={{ fontSize: 11 }}>📌</span> : null}
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "rgb(var(--color-text-main) / 1)"
            }}
          >
            {entry.item.title}
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgb(var(--color-text-muted) / 1)",
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}
        >
          {preview}
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
          {tags.map((tag) => (
            <span
              key={`${entry.item.id}-${tag}`}
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 10,
                background: "rgb(var(--color-panel-alt) / 1)",
                color: "rgb(var(--color-text-muted) / 1)"
              }}
            >
              {tag}
            </span>
          ))}
          {entry.meta.noteKind === "alarm" ? (
            <span
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 10,
                background: palette.chipBg,
                color: palette.chipText
              }}
            >
              ⏰ {formatAlarmBadge(entry.item)}
            </span>
          ) : null}
          <button
            aria-label={entry.meta.pinned ? "Desafixar" : "Fixar"}
            onClick={(event) => {
              event.stopPropagation();
              onPin(entry.item);
            }}
            style={{
              marginLeft: "auto",
              fontSize: 11,
              border: "none",
              background: "none",
              padding: 0,
              color: "rgb(var(--color-text-muted) / 1)",
              cursor: "pointer"
            }}
            type="button"
          >
            📌
          </button>
        </div>
      </div>
      <div
        style={{
          fontSize: 10,
          color: "rgb(var(--color-text-muted) / 1)",
          flexShrink: 0,
          marginTop: 3
        }}
      >
        {formatShortDate(entry.item.startDate)}
      </div>
    </div>
  );
};
