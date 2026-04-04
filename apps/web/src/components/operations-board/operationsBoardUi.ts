import type { MuralCategory, OperationsBoardEventItem, OperationsBoardMessageItem } from "../../types";

export type MuralCategoria = MuralCategory;

export type MuralReaction = {
  emoji: string;
  count: number;
  ativo: boolean;
};

export type MuralReadChip = {
  ini: string;
  variant: "primary" | "secondary" | "summary";
};

export type MuralPalette = {
  bg: string;
  border: string;
  pin: string;
  titleColor: string;
  bodyColor: string;
  labelColor: string;
  authorColor: string;
  timeColor: string;
};

export const CATEGORIAS: Record<
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
      bg: "#1a0508",
      border: "#7a1a20",
      pin: "#ff1744",
      titleColor: "#ffe8ea",
      bodyColor: "#ffb3bb",
      labelColor: "#ffc5cb",
      authorColor: "#ff8a96",
      timeColor: "#ffb3bb"
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
      bg: "#051525",
      border: "#0e4060",
      pin: "#00b4d8",
      titleColor: "#cdf0ff",
      bodyColor: "#90d4ee",
      labelColor: "#b8e8f8",
      authorColor: "#7fc8e8",
      timeColor: "#90d4ee"
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
      bg: "#1a1200",
      border: "#6b4a00",
      pin: "#ffb300",
      titleColor: "#fff3cc",
      bodyColor: "#ffd966",
      labelColor: "#ffe499",
      authorColor: "#ffc933",
      timeColor: "#ffd966"
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
      bg: "#051a0a",
      border: "#0d4a1a",
      pin: "#00ff88",
      titleColor: "#d4fff0",
      bodyColor: "#80ffcc",
      labelColor: "#a8ffdc",
      authorColor: "#5cffc0",
      timeColor: "#80ffcc"
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
      bg: "#0d1a2a",
      border: "#1a4060",
      pin: "#00e5ff",
      titleColor: "#e0f7ff",
      bodyColor: "#80d8f0",
      labelColor: "#b0e8f8",
      authorColor: "#60c8e8",
      timeColor: "#80d8f0"
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
      bg: "#0a1520",
      border: "#1a3a52",
      pin: "#7fb3d3",
      titleColor: "#cdf0ff",
      bodyColor: "#9bbdd4",
      labelColor: "#b3d0e8",
      authorColor: "#88aac4",
      timeColor: "#9bbdd4"
    }
  }
};

export const ROTACOES = [-1.2, 1.5, -0.8, 0.7, -1.8, 1.1, -0.5, 1.3, -1.0, 0.9];

export const FILTROS: Array<{ key: "todos" | MuralCategoria; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "urgente", label: "Urgentes" },
  { key: "info", label: "Informativos" },
  { key: "aviso", label: "Avisos" },
  { key: "comunicado", label: "Comunicados" },
  { key: "procedimento", label: "Procedimentos" },
  { key: "geral", label: "Geral" }
];

const DEFAULT_REACTIONS = ["👍", "🎉", "✅"];

export const isDarkModeActive = () =>
  typeof document !== "undefined" && document.documentElement.classList.contains("dark");

export const getCategoryPalette = (categoria: MuralCategoria, darkMode: boolean): MuralPalette =>
  darkMode ? CATEGORIAS[categoria].dark : CATEGORIAS[categoria].light;

export const formatDate = (value: string | null) => {
  if (!value) {
    return "agora";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
};

export const buildInitialReactions = (): MuralReaction[] =>
  DEFAULT_REACTIONS.map((emoji, index) => ({
    emoji,
    count: index === 0 ? 1 : 0,
    ativo: false
  }));

export const buildReadChips = (
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

export const appendViewerChip = (
  chips: MuralReadChip[],
  actorName: string,
  actorLogin: string
): MuralReadChip[] => {
  const initial =
    actorName.trim().charAt(0).toUpperCase() || actorLogin.trim().charAt(0).toUpperCase() || "?";
  const base = chips.filter((chip) => chip.variant !== "summary");
  const next = [...base, { ini: initial, variant: "secondary" as const }];
  if (next.length > 4) {
    return [...next.slice(0, 3), { ini: `+${next.length - 3}`, variant: "summary" as const }];
  }
  return next;
};

export const buildTimelineLabels: Record<string, string> = {
  created: "Criou",
  commented: "Comentou",
  updated: "Atualizou",
  resolved: "Encerrou",
  reopened: "Reabriu",
  viewed: "Visualizou"
};

export const TIMELINE_ICONS: Record<string, string> = {
  created: "✨",
  commented: "💬",
  updated: "✏",
  resolved: "✅",
  reopened: "🔁",
  viewed: "👁"
};
