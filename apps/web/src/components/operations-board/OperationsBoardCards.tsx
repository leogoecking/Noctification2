import { useState } from "react";
import type { OperationsBoardMessageItem } from "../../types";
import {
  CATEGORIAS,
  formatDate,
  getCategoryPalette,
  type MuralCategoria,
  type MuralReaction,
  type MuralReadChip
} from "./operationsBoardUi";

interface CardAvisoProps {
  aviso: OperationsBoardMessageItem;
  categoria: MuralCategoria;
  darkMode: boolean;
  reactions: MuralReaction[];
  readers: MuralReadChip[];
  rotacao: number;
  onOpen: (message: OperationsBoardMessageItem) => void;
  onToggleReacao: (messageId: number, reactionIndex: number) => void;
}

export const CardAviso = ({
  aviso,
  categoria,
  darkMode,
  reactions,
  readers,
  rotacao,
  onOpen,
  onToggleReacao
}: CardAvisoProps) => {
  const [expandido, setExpandido] = useState(false);
  const [hovered, setHovered] = useState(false);
  const cat = getCategoryPalette(categoria, darkMode);
  const rot = hovered || expandido ? 0 : rotacao;
  const scale = expandido ? 1.02 : hovered ? 1.03 : 1;

  return (
    <div
      onClick={() => {
        setExpandido((current) => !current);
        onOpen(aviso);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpandido((current) => !current);
          onOpen(aviso);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      style={{
        background: cat.bg,
        border: `1.5px solid ${cat.border}`,
        borderRadius: 14,
        padding: "16px 14px 12px",
        cursor: "pointer",
        transform: `rotate(${rot}deg) scale(${scale})`,
        transition: "transform 0.2s cubic-bezier(.34,1.4,.64,1)",
        position: "relative",
        marginBottom: 12,
        breakInside: "avoid",
        userSelect: "none",
        textAlign: "left",
        width: "100%",
        fontFamily: "inherit",
        outline: "none"
      }}
    >
      <div
        style={{
          width: 13,
          height: 13,
          borderRadius: "50%",
          background: cat.pin,
          border: "2px solid rgba(0,0,0,0.15)",
          position: "absolute",
          top: -6,
          left: "50%",
          transform: "translateX(-50%)"
        }}
      />

      <div
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: cat.labelColor,
          marginBottom: 5,
          letterSpacing: "0.04em"
        }}
      >
        {CATEGORIAS[categoria].label}
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: cat.titleColor,
          lineHeight: 1.35,
          marginBottom: 5
        }}
      >
        {aviso.title}
      </div>

      <div
        style={{
          fontSize: 12,
          color: cat.bodyColor,
          lineHeight: 1.5,
          maxHeight: expandido ? 320 : 38,
          overflow: "hidden",
          transition: "max-height 0.3s ease"
        }}
      >
        {aviso.body}
      </div>

      {!expandido ? (
        <div style={{ fontSize: 10, color: cat.bodyColor, opacity: 0.5, marginTop: 3 }}>
          Clique para expandir
        </div>
      ) : null}

      {readers.length > 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 8 }}>
          {readers.map((reader, index) => (
            <div
              key={`${aviso.id}-reader-${index}`}
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: reader.variant === "primary" ? cat.pin : cat.border,
                color: reader.variant === "primary" ? "#ffffff" : cat.bodyColor,
                fontSize: 8,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1.5px solid rgba(0,0,0,0.1)"
              }}
            >
              {reader.ini}
            </div>
          ))}
          <span style={{ fontSize: 10, color: cat.bodyColor, opacity: 0.65, marginLeft: 2 }}>
            {readers.length} {readers.length === 1 ? "viu" : "viram"}
          </span>
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 9,
          gap: 10
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 500, color: cat.authorColor }}>{aviso.authorName}</span>
        <span style={{ fontSize: 10, color: cat.timeColor, opacity: 0.65 }}>{formatDate(aviso.updatedAt)}</span>
      </div>

      <div
        style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}
        onClick={(event) => event.stopPropagation()}
      >
        {reactions.map((reaction, index) => (
          <button
            key={`${aviso.id}-reaction-${reaction.emoji}`}
            onClick={() => onToggleReacao(aviso.id, index)}
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 12,
              border: `1px solid ${reaction.ativo ? (darkMode ? "rgba(255,255,255,0.24)" : "rgba(0,0,0,0.25)") : darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
              background: reaction.ativo
                ? darkMode
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(255,255,255,0.85)"
                : darkMode
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.5)",
              color: cat.bodyColor,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.12s"
            }}
            type="button"
          >
            {reaction.emoji} {reaction.count}
          </button>
        ))}
      </div>
    </div>
  );
};

interface FormNovoAvisoProps {
  categoria: MuralCategoria;
  darkMode: boolean;
  title: string;
  body: string;
  onBodyChange: (value: string) => void;
  onCancel: () => void;
  onCategoryChange: (value: MuralCategoria) => void;
  onSave: () => void;
  onTitleChange: (value: string) => void;
}

export const FormNovoAviso = ({
  categoria,
  darkMode,
  title,
  body,
  onBodyChange,
  onCancel,
  onCategoryChange,
  onSave,
  onTitleChange
}: FormNovoAvisoProps) => {
  const cat = getCategoryPalette(categoria, darkMode);

  return (
    <div
      style={{
        background: cat.bg,
        border: `1.5px solid ${cat.border}`,
        borderRadius: 14,
        padding: "20px 18px 16px",
        position: "relative",
        marginBottom: 16
      }}
    >
      <div
        style={{
          width: 13,
          height: 13,
          borderRadius: "50%",
          background: cat.pin,
          border: "2px solid rgba(0,0,0,0.15)",
          position: "absolute",
          top: -6,
          left: "50%",
          transform: "translateX(-50%)"
        }}
      />

      <div style={{ fontSize: 12, fontWeight: 500, color: cat.labelColor, marginBottom: 12 }}>
        Novo aviso
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {Object.entries(CATEGORIAS).map(([key, item]) => (
          <button
            key={key}
            onClick={() => onCategoryChange(key as MuralCategoria)}
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: "3px 10px",
              borderRadius: 20,
              border: `1.5px solid ${categoria === key ? getCategoryPalette(key as MuralCategoria, darkMode).pin : darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
              background: categoria === key
                ? getCategoryPalette(key as MuralCategoria, darkMode).pin
                : darkMode
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.5)",
              color: categoria === key ? "#fff" : getCategoryPalette(key as MuralCategoria, darkMode).labelColor,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s"
            }}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <input
        aria-label="Titulo do aviso"
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Título do aviso..."
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 8,
          marginBottom: 8,
          border: `1px solid ${cat.border}`,
          background: darkMode ? "rgba(17,24,39,0.32)" : "rgba(255,255,255,0.6)",
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "inherit",
          color: cat.titleColor,
          outline: "none"
        }}
        value={title}
      />
      <textarea
        aria-label="Corpo do aviso"
        onChange={(event) => onBodyChange(event.target.value)}
        placeholder="Descreva o aviso com mais detalhes..."
        rows={3}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 8,
          marginBottom: 14,
          border: `1px solid ${cat.border}`,
          background: darkMode ? "rgba(17,24,39,0.32)" : "rgba(255,255,255,0.6)",
          fontSize: 12,
          fontFamily: "inherit",
          color: cat.bodyColor,
          outline: "none",
          resize: "vertical"
        }}
        value={body}
      />

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            fontSize: 12,
            fontWeight: 500,
            padding: "6px 16px",
            borderRadius: 20,
            border: `1px solid ${darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)"}`,
            background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.5)",
            cursor: "pointer",
            fontFamily: "inherit",
            color: cat.bodyColor
          }}
          type="button"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          style={{
            fontSize: 12,
            fontWeight: 500,
            padding: "6px 16px",
            borderRadius: 20,
            border: "none",
            background: cat.pin,
            color: "#fff",
            cursor: title.trim() && body.trim() ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            opacity: title.trim() && body.trim() ? 1 : 0.5
          }}
          type="button"
        >
          Publicar aviso
        </button>
      </div>
    </div>
  );
};
