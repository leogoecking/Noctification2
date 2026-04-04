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
