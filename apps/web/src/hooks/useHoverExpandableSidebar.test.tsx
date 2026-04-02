import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useHoverExpandableSidebar } from "./useHoverExpandableSidebar";

const STORAGE_KEY = "test-hover-expandable-sidebar";

const TestHarness = () => {
  const { isExpanded, isPinned, onMouseEnter, onMouseLeave, togglePinned } =
    useHoverExpandableSidebar({
      storageKey: STORAGE_KEY
    });

  return (
    <div>
      <button onClick={togglePinned} type="button">
        toggle-pin
      </button>
      <div
        data-testid="sidebar-zone"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        sidebar
      </div>
      <span>{isExpanded ? "expanded" : "collapsed"}</span>
      <span>{isPinned ? "pinned" : "unpinned"}</span>
    </div>
  );
};

describe("useHoverExpandableSidebar", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    vi.useRealTimers();
  });

  it("expande no hover sem fixar a preferencia", () => {
    render(<TestHarness />);

    expect(screen.getByText("collapsed")).toBeInTheDocument();
    expect(screen.getByText("unpinned")).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId("sidebar-zone"));
    expect(screen.getByText("expanded")).toBeInTheDocument();
    expect(screen.getByText("unpinned")).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByTestId("sidebar-zone"));
    expect(screen.getByText("expanded")).toBeInTheDocument();
  });

  it("espera antes de recolher quando o mouse sai da lateral", () => {
    vi.useFakeTimers();

    render(<TestHarness />);

    fireEvent.mouseEnter(screen.getByTestId("sidebar-zone"));
    expect(screen.getByText("expanded")).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByTestId("sidebar-zone"));
    act(() => {
      vi.advanceTimersByTime(119);
    });
    expect(screen.getByText("expanded")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText("collapsed")).toBeInTheDocument();
  });

  it("persiste o estado fixado no localStorage", () => {
    render(<TestHarness />);

    fireEvent.click(screen.getByRole("button", { name: "toggle-pin" }));

    expect(screen.getByText("expanded")).toBeInTheDocument();
    expect(screen.getByText("pinned")).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true");
  });
});
