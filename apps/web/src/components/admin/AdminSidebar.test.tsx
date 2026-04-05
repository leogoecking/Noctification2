import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminSidebar } from "./AdminSidebar";

vi.mock("../../hooks/useHoverExpandableSidebar", () => ({
  useHoverExpandableSidebar: () => ({
    isExpanded: true,
    isPinned: false,
    onMouseEnter: vi.fn(),
    onMouseLeave: vi.fn(),
    togglePinned: vi.fn()
  })
}));

describe("AdminSidebar", () => {
  it("renderiza modulos opcionais e dispara as acoes corretas", () => {
    const onSelect = vi.fn();
    const onOpenApr = vi.fn();
    const onOpenKmlPostes = vi.fn();
    const onOpenDashboard = vi.fn();
    const onLogout = vi.fn();

    render(
      <AdminSidebar
        menu="users"
        onSelect={onSelect}
        aprActive={false}
        aprEnabled
        kmlPosteActive={false}
        kmlPosteEnabled
        onOpenApr={onOpenApr}
        onOpenKmlPostes={onOpenKmlPostes}
        onOpenDashboard={onOpenDashboard}
        onLogout={onLogout}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
    fireEvent.click(screen.getByRole("button", { name: "Usuarios" }));
    fireEvent.click(screen.getByRole("button", { name: "APR" }));
    fireEvent.click(screen.getByRole("button", { name: "KML/KMZ" }));
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    expect(onOpenDashboard).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("users");
    expect(onOpenApr).toHaveBeenCalledTimes(1);
    expect(onOpenKmlPostes).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("oculta modulos opcionais quando nao estao habilitados", () => {
    render(<AdminSidebar menu="dashboard" onSelect={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "APR" })).toBeNull();
    expect(screen.queryByRole("button", { name: "KML/KMZ" })).toBeNull();
  });
});
