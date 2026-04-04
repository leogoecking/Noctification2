import type { ReactNode } from "react";

export interface AdminSidebarNavItem {
  key: string;
  label: string;
  ariaLabel: string;
  active: boolean;
  icon: ReactNode;
  onClick: () => void;
}

export const SidebarLogo = () => (
  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-panelAlt ring-1 ring-outlineSoft/60">
    <img alt="Noctification" className="h-7 w-7 object-contain" src="/icons/icon-192.svg" />
  </div>
);

const menuBaseClass =
  "flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition";

export const menuButtonClass = (active: boolean): string => {
  return `${menuBaseClass} ${
    active ? "bg-accent/15 text-accent border-l-2 border-accent" : "text-textMuted hover:bg-surfaceHigh hover:text-textMain"
  }`;
};

export const sidebarSectionTitleClass =
  "px-3 text-xs font-semibold uppercase tracking-wide text-textMuted/70";

export const getSidebarDesktopStateClass = (isExpanded: boolean): string =>
  isExpanded
    ? "lg:w-64 lg:px-4"
    : "lg:w-20 lg:px-3";

export const getSidebarTextClass = (isExpanded: boolean): string =>
  isExpanded
    ? "min-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 lg:max-w-[12rem] lg:opacity-100"
    : "min-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 lg:max-w-0 lg:opacity-0";

export const getSidebarSectionTitleVisibilityClass = (isExpanded: boolean): string =>
  isExpanded ? "lg:opacity-100" : "lg:opacity-0";

export const SidebarTooltip = ({ isExpanded, label }: { isExpanded: boolean; label: string }) =>
  isExpanded ? null : (
    <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-20 hidden -translate-y-1/2 rounded-xl border border-outlineSoft/80 bg-panel px-3 py-2 text-[11px] font-semibold normal-case tracking-normal text-textMain shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 lg:block lg:opacity-0">
      {label}
    </span>
  );

export const IconPin = ({ pinned }: { pinned: boolean }) => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
    <path d="M15 3v4l3 3v2h-5v7l-1 2-1-2v-7H6v-2l3-3V3z" fill="currentColor" />
    {pinned ? <circle cx="18" cy="6" fill="currentColor" r="2.2" /> : null}
  </svg>
);

export const IconDashboard = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z"
      fill="currentColor"
    />
  </svg>
);

export const IconBell = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22m6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1z"
      fill="currentColor"
    />
  </svg>
);

export const IconUsers = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91M4 13c1.1 0 2-.9 2-2S5.1 9 4 9s-2 .9-2 2 .9 2 2 2m16 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2M12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3"
      fill="currentColor"
    />
  </svg>
);

export const IconChecklist = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9z"
      fill="currentColor"
    />
  </svg>
);

export const IconArchive = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M3 4h18v4H3zm2 4h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zm5 4h4v2h-4z"
      fill="currentColor"
    />
  </svg>
);

export const IconPulse = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M3 13h4l2-5 4 10 2-5h6v-2h-4.8l-1.2 3-4-10-3 7H3z"
      fill="currentColor"
    />
  </svg>
);

export const IconClock = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m1 11h-5V7h2v4h3z"
      fill="currentColor"
    />
  </svg>
);

export const IconApr = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5zm0 4 4 1.5V11c0 3.2-1.9 6.3-4 7.5-2.1-1.2-4-4.3-4-7.5V7.5zm-1 3v5l4-2.5z"
      fill="currentColor"
    />
  </svg>
);

export const IconMapPin = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M12 22s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11m0-8.5A2.5 2.5 0 1 0 12 8a2.5 2.5 0 0 0 0 5"
      fill="currentColor"
    />
  </svg>
);

export const IconLogout = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path
      d="M10 17l1.4-1.4L9.8 14H18v-2H9.8l1.6-1.6L10 9l-4 4zm-5 4h7v-2H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2"
      fill="currentColor"
    />
  </svg>
);
