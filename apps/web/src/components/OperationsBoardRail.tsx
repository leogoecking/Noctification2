import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { MuralCategory, OperationsBoardEventItem, OperationsBoardMessageItem } from "../types";
import { useOperationsBoardSocket } from "../hooks/useOperationsBoardSocket";
import type { BoardViewedPayload } from "../hooks/useOperationsBoardSocket";

interface OperationsBoardRailProps {
  currentUserName: string;
  onError: (message: string) => void;
  onToast: (message: string) => void;
  title?: string;
  subtitle?: string;
}

type MuralCategoria = MuralCategory;

type MuralReaction = {
  emoji: string;
  count: number;
  ativo: boolean;
};

type MuralReadChip = {
  ini: string;
  variant: "primary" | "secondary" | "summary";
};

type MuralPalette = {
  bg: string;
  border: string;
  pin: string;
  titleColor: string;
  bodyColor: string;
  labelColor: string;
  authorColor: string;
  timeColor: string;
};

const CATEGORIAS: Record<
  MuralCategoria,
  {
    label: string;
    light: MuralPalette;
    dark: MuralPalette;
  }
> = {
  urgente: {
    label: "⚠ Urgente",
    light: {
      bg: "#FCEBEB",
      border: "#F09595",
      pin: "#E24B4A",
      titleColor: "#501313",
      bodyColor: "#791F1F",
      labelColor: "#791F1F",
      authorColor: "#A32D2D",
      timeColor: "#791F1F"
    },
    dark: {
      bg: "#35181D",
      border: "#8F4148",
      pin: "#E86569",
      titleColor: "#FFE7E8",
      bodyColor: "#F4B7BA",
      labelColor: "#FFD1D4",
      authorColor: "#FF9EA3",
      timeColor: "#EFB5B8"
    }
  },
  info: {
    label: "ℹ Informativo",
    light: {
      bg: "#E6F1FB",
      border: "#85B7EB",
      pin: "#378ADD",
      titleColor: "#042C53",
      bodyColor: "#0C447C",
      labelColor: "#0C447C",
      authorColor: "#185FA5",
      timeColor: "#0C447C"
    },
    dark: {
      bg: "#15283B",
      border: "#4A78A8",
      pin: "#58A5F1",
      titleColor: "#E4F3FF",
      bodyColor: "#B6D7F5",
      labelColor: "#CCE6FF",
      authorColor: "#92C8F7",
      timeColor: "#B6D7F5"
    }
  },
  aviso: {
    label: "⏰ Aviso",
    light: {
      bg: "#FAEEDA",
      border: "#FAC775",
      pin: "#BA7517",
      titleColor: "#412402",
      bodyColor: "#633806",
      labelColor: "#633806",
      authorColor: "#854F0B",
      timeColor: "#633806"
    },
    dark: {
      bg: "#382915",
      border: "#9C7234",
      pin: "#D39A38",
      titleColor: "#FFF0D4",
      bodyColor: "#E7C897",
      labelColor: "#F5DFB5",
      authorColor: "#F0BF70",
      timeColor: "#E0C18D"
    }
  },
  comunicado: {
    label: "✅ Comunicado",
    light: {
      bg: "#EAF3DE",
      border: "#97C459",
      pin: "#639922",
      titleColor: "#173404",
      bodyColor: "#27500A",
      labelColor: "#27500A",
      authorColor: "#3B6D11",
      timeColor: "#27500A"
    },
    dark: {
      bg: "#1E2D18",
      border: "#5D8B3B",
      pin: "#7FBC3A",
      titleColor: "#EAF8DF",
      bodyColor: "#BDD9A3",
      labelColor: "#D8EFC5",
      authorColor: "#A4D272",
      timeColor: "#B8D69A"
    }
  },
  procedimento: {
    label: "📋 Procedimento",
    light: {
      bg: "#EEEDFE",
      border: "#AFA9EC",
      pin: "#7F77DD",
      titleColor: "#26215C",
      bodyColor: "#3C3489",
      labelColor: "#26215C",
      authorColor: "#534AB7",
      timeColor: "#26215C"
    },
    dark: {
      bg: "#252043",
      border: "#7066B8",
      pin: "#9B8EF0",
      titleColor: "#F0ECFF",
      bodyColor: "#C7BEF5",
      labelColor: "#DDD5FF",
      authorColor: "#B4A9F8",
      timeColor: "#C8C0F1"
    }
  },
  geral: {
    label: "📌 Geral",
    light: {
      bg: "#F1EFE8",
      border: "#B4B2A9",
      pin: "#888780",
      titleColor: "#2C2C2A",
      bodyColor: "#5F5E5A",
      labelColor: "#444441",
      authorColor: "#5F5E5A",
      timeColor: "#444441"
    },
    dark: {
      bg: "#2B2924",
      border: "#60584B",
      pin: "#9A9284",
      titleColor: "#F2EEE6",
      bodyColor: "#CEC8BC",
      labelColor: "#E3DDD1",
      authorColor: "#BEB7AA",
      timeColor: "#C9C2B7"
    }
  }
};

const ROTACOES = [-1.2, 1.5, -0.8, 0.7, -1.8, 1.1, -0.5, 1.3, -1.0, 0.9];

const FILTROS: Array<{ key: "todos" | MuralCategoria; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "urgente", label: "Urgentes" },
  { key: "info", label: "Informativos" },
  { key: "aviso", label: "Avisos" },
  { key: "comunicado", label: "Comunicados" },
  { key: "procedimento", label: "Procedimentos" },
  { key: "geral", label: "Geral" }
];

const DEFAULT_REACTIONS = ["👍", "🎉", "✅"];

const isDarkModeActive = () =>
  typeof document !== "undefined" && document.documentElement.classList.contains("dark");

const getCategoryPalette = (categoria: MuralCategoria, darkMode: boolean): MuralPalette =>
  darkMode ? CATEGORIAS[categoria].dark : CATEGORIAS[categoria].light;

const formatDate = (value: string | null) => {
  if (!value) {
    return "agora";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
};


const buildInitialReactions = (): MuralReaction[] =>
  DEFAULT_REACTIONS.map((emoji, index) => ({
    emoji,
    count: index === 0 ? 1 : 0,
    ativo: false
  }));

const buildReadChips = (
  message: OperationsBoardMessageItem,
  timeline: OperationsBoardEventItem[]
): MuralReadChip[] => {
  const seenKeys = new Set<string>();
  const chips: MuralReadChip[] = [];

  const seed = [
    {
      name: message.authorName,
      login: message.authorLogin
    },
    ...timeline.map((event) => ({
      name: event.actorName,
      login: event.actorLogin
    }))
  ];

  seed.forEach((item, index) => {
    const key = `${item.name}:${item.login}`;
    if (seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    const initial = item.name.trim().charAt(0).toUpperCase() || item.login.trim().charAt(0).toUpperCase() || "?";

    chips.push({
      ini: initial,
      variant: index === 0 ? "primary" : "secondary"
    });
  });

  if (chips.length > 4) {
    return [
      ...chips.slice(0, 3),
      {
        ini: `+${chips.length - 3}`,
        variant: "summary"
      }
    ];
  }

  return chips;
};

const appendViewerChip = (chips: MuralReadChip[], actorName: string, actorLogin: string): MuralReadChip[] => {
  const initial =
    actorName.trim().charAt(0).toUpperCase() || actorLogin.trim().charAt(0).toUpperCase() || "?";
  const base = chips.filter((c) => c.variant !== "summary");
  const next = [...base, { ini: initial, variant: "secondary" as const }];
  if (next.length > 4) {
    return [...next.slice(0, 3), { ini: `+${next.length - 3}`, variant: "summary" as const }];
  }
  return next;
};

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

const CardAviso = ({
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

const FormNovoAviso = ({
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

const buildTimelineLabels: Record<string, string> = {
  created: "Criou",
  commented: "Comentou",
  updated: "Atualizou",
  resolved: "Encerrou",
  reopened: "Reabriu",
  viewed: "Visualizou"
};

const TIMELINE_ICONS: Record<string, string> = {
  created: "✨",
  commented: "💬",
  updated: "✏",
  resolved: "✅",
  reopened: "🔁",
  viewed: "👁"
};

export const OperationsBoardRail = ({
  currentUserName,
  onError,
  onToast,
  title = "Mural operacional",
  subtitle = "Recados compartilhados entre os usuarios"
}: OperationsBoardRailProps) => {
  const [darkMode, setDarkMode] = useState(isDarkModeActive);
  const [messages, setMessages] = useState<OperationsBoardMessageItem[]>([]);
  const [selected, setSelected] = useState<OperationsBoardMessageItem | null>(null);
  const [timeline, setTimeline] = useState<OperationsBoardEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formCategoria, setFormCategoria] = useState<MuralCategoria>("info");
  const [filtro, setFiltro] = useState<"todos" | MuralCategoria>("todos");
  const [reactionsById, setReactionsById] = useState<Record<number, MuralReaction[]>>({});
  const [readersById, setReadersById] = useState<Record<number, MuralReadChip[]>>({});
  const mountedRef = useRef(true);
  // tracks "name:login" keys already shown per message — prevents duplicate chips from socket events
  const viewerSeenRef = useRef<Record<number, Set<string>>>({});

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof MutationObserver === "undefined") {
      return;
    }

    const observer = new MutationObserver(() => {
      setDarkMode(isDarkModeActive());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });

    return () => observer.disconnect();
  }, []);

  const loadMessages = useCallback(async () => {
    if (!mountedRef.current) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.myOperationsBoard("?status=active&limit=8");
      if (mountedRef.current) {
        setMessages(response.messages);
      }
    } catch (error) {
      if (mountedRef.current) {
        onError(error instanceof ApiError ? error.message : "Falha ao carregar mural operacional");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [onError]);

  const openMessage = useCallback(
    async (message: OperationsBoardMessageItem) => {
      if (!mountedRef.current) {
        return;
      }

      setDetailLoading(true);
      try {
        const response = await api.myOperationsBoardMessage(message.id);
        if (mountedRef.current) {
          setSelected(response.message);
          setTimeline(response.timeline);
          setCommentDraft("");
          const seed = new Set<string>();
          seed.add(`${response.message.authorName}:${response.message.authorLogin}`);
          response.timeline.forEach((e) => seed.add(`${e.actorName}:${e.actorLogin}`));
          viewerSeenRef.current[message.id] = seed;
          setReadersById((current) => ({
            ...current,
            [message.id]: buildReadChips(response.message, response.timeline)
          }));
        }
      } catch (error) {
        if (mountedRef.current) {
          onError(error instanceof ApiError ? error.message : "Falha ao carregar recado");
        }
      } finally {
        if (mountedRef.current) {
          setDetailLoading(false);
        }
      }
    },
    [onError]
  );

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const handleBoardViewed = useCallback((payload: BoardViewedPayload) => {
    if (!mountedRef.current) return;
    const { messageId, actorName, actorLogin } = payload;
    const key = `${actorName}:${actorLogin}`;
    const seen = viewerSeenRef.current[messageId];
    if (!seen || seen.has(key)) return;
    seen.add(key);
    setReadersById((current) => {
      const chips = current[messageId];
      if (!chips) return current;
      return { ...current, [messageId]: appendViewerChip(chips, actorName, actorLogin) };
    });
  }, []);

  useOperationsBoardSocket({ onViewed: handleBoardViewed });

  const saveMessage = async () => {
    if (!formTitle.trim() || !formBody.trim()) {
      onError("Titulo e mensagem sao obrigatorios");
      return;
    }

    try {
      if (selected && !novoAberto) {
        const response = await api.updateMyOperationsBoardMessage(selected.id, {
          title: formTitle,
          body: formBody,
          category: formCategoria
        });

        if (!mountedRef.current) {
          return;
        }

        setSelected(response.message);
        setMessages((prev) =>
          [response.message, ...prev.filter((item) => item.id !== response.message.id)].slice(0, 8)
        );
        await openMessage(response.message);
        onToast("Recado atualizado");
        return;
      }

      const response = await api.createMyOperationsBoardMessage({
        title: formTitle,
        body: formBody,
        category: formCategoria
      });

      if (!mountedRef.current) {
        return;
      }

      setMessages((prev) => [response.message, ...prev].slice(0, 8));
      setReactionsById((current) => ({
        ...current,
        [response.message.id]: buildInitialReactions()
      }));
      viewerSeenRef.current[response.message.id] = new Set([
        `${response.message.authorName}:${response.message.authorLogin}`
      ]);
      setReadersById((current) => ({
        ...current,
        [response.message.id]: buildReadChips(response.message, [])
      }));
      setFormTitle("");
      setFormBody("");
      setFormCategoria("info");
      setNovoAberto(false);
      onToast("Recado publicado");
    } catch (error) {
      if (mountedRef.current) {
        onError(error instanceof ApiError ? error.message : "Falha ao salvar recado");
      }
    }
  };

  const prepareEdition = () => {
    if (!selected) {
      return;
    }

    setFormTitle(selected.title);
    setFormBody(selected.body);
    setFormCategoria(selected.category);
    setNovoAberto(false);
  };

  const submitComment = async () => {
    if (!selected) {
      return;
    }

    if (!commentDraft.trim()) {
      onError("Escreva um comentario para registrar na timeline");
      return;
    }

    try {
      const response = await api.createMyOperationsBoardComment(selected.id, { body: commentDraft });
      if (!mountedRef.current) {
        return;
      }

      setTimeline((prev) => [response.event, ...prev]);
      setCommentDraft("");
      const newTimeline = [response.event, ...timeline];
      const commentSeed = new Set<string>();
      commentSeed.add(`${selected.authorName}:${selected.authorLogin}`);
      newTimeline.forEach((e) => commentSeed.add(`${e.actorName}:${e.actorLogin}`));
      viewerSeenRef.current[selected.id] = commentSeed;
      setReadersById((current) => ({
        ...current,
        [selected.id]: buildReadChips(selected, newTimeline)
      }));
      setMessages((prev) =>
        prev.map((item) =>
          item.id === selected.id
            ? {
                ...item,
                updatedAt: response.event.createdAt
              }
            : item
        )
      );
      onToast("Comentario registrado");
    } catch (error) {
      if (mountedRef.current) {
        onError(error instanceof ApiError ? error.message : "Falha ao comentar no mural");
      }
    }
  };

  const resolveSelected = async () => {
    if (!selected) {
      return;
    }

    try {
      const response = await api.updateMyOperationsBoardMessage(selected.id, { status: "resolved" });
      if (!mountedRef.current) {
        return;
      }

      setSelected(response.message);
      setMessages((prev) => prev.filter((item) => item.id !== response.message.id));
      await openMessage(response.message);
      onToast("Recado encerrado");
    } catch (error) {
      if (mountedRef.current) {
        onError(error instanceof ApiError ? error.message : "Falha ao encerrar recado");
      }
    }
  };

  const handleToggleReacao = (id: number, index: number) => {
    setReactionsById((current) => {
      const existing = current[id] ?? buildInitialReactions();

      return {
        ...current,
        [id]: existing.map((reaction, reactionIndex) => {
          if (reactionIndex !== index) {
            return reaction;
          }

          const ativo = !reaction.ativo;

          return {
            ...reaction,
            ativo,
            count: Math.max(0, reaction.count + (ativo ? 1 : -1))
          };
        })
      };
    });
  };

  const filteredMessages = useMemo(
    () =>
      filtro === "todos"
        ? messages
        : messages.filter((message) => message.category === filtro),
    [filtro, messages]
  );

  const totalUrgentes = useMemo(
    () => messages.filter((message) => message.category === "urgente").length,
    [messages]
  );
  const totalVisualizacoes = useMemo(
    () => Object.values(readersById).reduce((acc, readers) => acc + readers.length, 0),
    [readersById]
  );
  const totalReacoes = useMemo(
    () =>
      messages.reduce(
        (acc, message) =>
          acc +
          (reactionsById[message.id] ?? buildInitialReactions()).reduce(
            (sum, reaction) => sum + reaction.count,
            0
          ),
        0
      ),
    [messages, reactionsById]
  );

  return (
    <>
      <article
        className="rounded-[1.5rem] border border-outlineSoft/70 bg-panel p-5 shadow-sm"
        data-testid="operations-board-rail"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#639922",
                animation: "livepulse 2s ease-in-out infinite"
              }}
            />
            <style>
              {`@keyframes livepulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}
            </style>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{title}</div>
              <div className="mt-1 text-xs text-textMuted">{subtitle}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {totalUrgentes > 0 ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: getCategoryPalette("urgente", darkMode).bg,
                  color: getCategoryPalette("urgente", darkMode).bodyColor,
                  border: `0.5px solid ${getCategoryPalette("urgente", darkMode).border}`
                }}
              >
                {totalUrgentes} urgente{totalUrgentes > 1 ? "s" : ""}
              </span>
            ) : null}
            <span
              className="rounded-full border border-outlineSoft bg-panelAlt px-3 py-1 text-[11px] font-medium text-textMuted"
            >
              {totalVisualizacoes} visualizações
            </span>
            <span
              className="rounded-full border border-outlineSoft bg-panelAlt px-3 py-1 text-[11px] font-medium text-textMuted"
            >
              {totalReacoes} reações
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
          {FILTROS.map((item) => (
            <button
              key={item.key}
              onClick={() => setFiltro(item.key)}
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "4px 12px",
                borderRadius: 20,
                border: "0.5px solid rgba(0,0,0,0.12)",
                background: filtro === item.key ? "rgb(var(--color-text-main))" : "rgb(var(--color-panel-alt))",
                color: filtro === item.key ? "rgb(var(--color-panel))" : "rgb(var(--color-text-muted))",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s"
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => {
              setFormTitle("");
              setFormBody("");
              setFormCategoria("info");
              setNovoAberto((current) => !current);
            }}
            style={{
              marginLeft: "auto",
              fontSize: 12,
              fontWeight: 500,
              padding: "6px 16px",
              borderRadius: 20,
              border: "0.5px solid rgba(0,0,0,0.12)",
              background: novoAberto ? "rgb(var(--color-text-main))" : "rgb(var(--color-panel-alt))",
              color: novoAberto ? "rgb(var(--color-panel))" : "rgb(var(--color-text-main))",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s"
            }}
            type="button"
          >
            {novoAberto ? "× Cancelar" : "+ Novo aviso"}
          </button>
        </div>

        {novoAberto ? (
          <FormNovoAviso
            body={formBody}
            categoria={formCategoria}
            darkMode={darkMode}
            onBodyChange={setFormBody}
            onCancel={() => setNovoAberto(false)}
            onCategoryChange={setFormCategoria}
            onSave={() => void saveMessage()}
            onTitleChange={setFormTitle}
            title={formTitle}
          />
        ) : null}

        {loading ? <p className="text-sm text-textMuted">Carregando mural...</p> : null}
        {!loading && filteredMessages.length === 0 ? (
          <div className="py-10 text-center text-sm text-textMuted">
            Nenhum aviso nessa categoria.
          </div>
        ) : (
          <div style={{ columns: "2 17rem", columnGap: 12 }}>
            {filteredMessages.map((message, index) => (
              <div key={message.id} style={{ breakInside: "avoid" }}>
                <CardAviso
                  aviso={message}
                  categoria={message.category}
                  darkMode={darkMode}
                  onOpen={(item) => void openMessage(item)}
                  onToggleReacao={handleToggleReacao}
                  readers={readersById[message.id] ?? []}
                  reactions={reactionsById[message.id] ?? buildInitialReactions()}
                  rotacao={ROTACOES[index % ROTACOES.length]}
                />
              </div>
            ))}
          </div>
        )}
      </article>

      {selected ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}
        >
          <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.75rem] bg-panel shadow-2xl sm:rounded-[1.75rem]">

            {/* Faixa colorida da categoria */}
            <div style={{ height: 4, background: getCategoryPalette(selected.category, darkMode).pin }} />

            {/* Header fixo (fora do scroll) */}
            <div className="px-6 pb-4 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      background: getCategoryPalette(selected.category, darkMode).bg,
                      color: getCategoryPalette(selected.category, darkMode).labelColor,
                      border: `1px solid ${getCategoryPalette(selected.category, darkMode).border}`
                    }}
                  >
                    {CATEGORIAS[selected.category].label}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    selected.status === "active"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-panelAlt text-textMuted"
                  }`}>
                    {selected.status === "active" ? "Ativo" : "Encerrado"}
                  </span>
                </div>
                <button
                  aria-label="Fechar"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-outlineSoft bg-panelAlt text-base text-textMuted transition-colors hover:bg-outlineSoft"
                  onClick={() => setSelected(null)}
                  type="button"
                >
                  ×
                </button>
              </div>

              <h3 className="mt-3 text-xl font-bold leading-snug text-textMain">
                {selected.title}
              </h3>

              <div className="mt-2 flex items-center gap-2">
                <div
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: getCategoryPalette(selected.category, darkMode).pin }}
                >
                  {selected.authorName.trim().charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-textMuted">
                  {selected.authorName} · {formatDate(selected.createdAt)}
                </span>
              </div>
            </div>

            <div className="mx-6 h-px bg-outlineSoft/50" />

            {/* Corpo com scroll */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {detailLoading ? (
                <p className="mt-6 text-sm text-textMuted">Carregando detalhes...</p>
              ) : (
                <>
                  {/* Conteúdo do recado */}
                  <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-textMain">
                    {selected.body}
                  </p>

                  {/* Ações */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-1.5 text-xs font-medium text-textMain transition-colors hover:bg-outlineSoft/60"
                      onClick={prepareEdition}
                      type="button"
                    >
                      Preparar edicao
                    </button>
                    {selected.status === "active" ? (
                      <button className="btn-warning text-xs" onClick={() => void resolveSelected()} type="button">
                        Encerrar recado
                      </button>
                    ) : null}
                  </div>

                  {/* Formulário de edição */}
                  {formTitle && formBody ? (
                    <div className="mt-5 space-y-3 rounded-xl border border-outlineSoft bg-panelAlt p-4">
                      <p className="text-xs font-semibold text-textMain">Edicao preparada</p>
                      <input
                        className="w-full rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-sm text-textMain outline-none"
                        onChange={(event) => setFormTitle(event.target.value)}
                        value={formTitle}
                      />
                      <textarea
                        className="min-h-24 w-full resize-none rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-sm text-textMain outline-none"
                        onChange={(event) => setFormBody(event.target.value)}
                        value={formBody}
                      />
                      <button className="btn-primary w-full" onClick={() => void saveMessage()} type="button">
                        Salvar alteracoes
                      </button>
                    </div>
                  ) : null}

                  {/* Comentário */}
                  <div className="mt-6">
                    <p className="mb-2 text-xs font-semibold text-textMuted">Comentario rapido</p>
                    <textarea
                      className="w-full resize-none rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2.5 text-sm text-textMain outline-none"
                      style={{ minHeight: 72 }}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      placeholder={`Atualizacao de ${currentUserName}...`}
                      value={commentDraft}
                    />
                    <button
                      className="mt-2 w-full rounded-xl border border-outlineSoft bg-panel px-4 py-2.5 text-sm font-semibold text-textMain transition-colors hover:bg-panelAlt disabled:opacity-40"
                      disabled={!commentDraft.trim()}
                      onClick={() => void submitComment()}
                      type="button"
                    >
                      Registrar comentario
                    </button>
                  </div>

                  {/* Timeline */}
                  {timeline.length > 0 ? (
                    <div className="mt-6">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-textMuted">Histórico</p>
                      <div className="space-y-2">
                        {timeline.map((event) => {
                          const icon = TIMELINE_ICONS[event.eventType] ?? "•";
                          const label = buildTimelineLabels[event.eventType] ?? event.eventType;

                          if (event.eventType === "viewed") {
                            return (
                              <div key={event.id} className="flex items-center gap-2 py-0.5">
                                <span className="text-xs text-textMuted/40">{icon}</span>
                                <span className="text-xs text-textMuted/60">
                                  {event.actorName} visualizou · {formatDate(event.createdAt)}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div key={event.id} className="rounded-xl bg-panelAlt p-3.5">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm leading-none">{icon}</span>
                                  <span className="text-sm font-semibold text-textMain">{event.actorName}</span>
                                  <span className="rounded-full bg-outlineSoft/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-textMuted">
                                    {label}
                                  </span>
                                </div>
                                <span className="flex-shrink-0 text-[11px] text-textMuted">
                                  {formatDate(event.createdAt)}
                                </span>
                              </div>
                              {event.body ? (
                                <p className="mt-2 whitespace-pre-wrap border-l-2 border-outlineSoft pl-3 text-sm text-textMain">
                                  {event.body}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
