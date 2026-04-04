import {
  getSidebarSectionTitleVisibilityClass,
  getSidebarTextClass,
  menuButtonClass,
  SidebarTooltip,
  sidebarSectionTitleClass,
  type AdminSidebarNavItem
} from "./adminSidebarUi";

interface AdminSidebarSectionProps {
  title: string;
  isExpanded: boolean;
  items: AdminSidebarNavItem[];
}

export const AdminSidebarSection = ({
  title,
  isExpanded,
  items
}: AdminSidebarSectionProps) => {
  return (
    <div className="space-y-2">
      <p
        className={`${sidebarSectionTitleClass} transition-opacity duration-200 ${getSidebarSectionTitleVisibilityClass(
          isExpanded
        )}`}
      >
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <button
            aria-label={item.ariaLabel}
            className={`${menuButtonClass(item.active)} group relative`}
            key={item.key}
            onClick={item.onClick}
            title={!isExpanded ? item.label : undefined}
            type="button"
          >
            <span className="shrink-0 text-textMain">{item.icon}</span>
            <span className={getSidebarTextClass(isExpanded)}>{item.label}</span>
            <SidebarTooltip isExpanded={isExpanded} label={item.label} />
          </button>
        ))}
      </div>
    </div>
  );
};
