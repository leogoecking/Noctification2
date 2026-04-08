export interface BoardChangedPayload {
  event: "created" | "updated" | "commented";
  messageId: number;
}

const BOARD_CHANGED_EVENT = "noctification:board:changed";

export const dispatchBoardChanged = (payload: BoardChangedPayload) => {
  window.dispatchEvent(
    new CustomEvent<BoardChangedPayload>(BOARD_CHANGED_EVENT, { detail: payload })
  );
};

export const subscribeBoardChanged = (
  callback: (payload: BoardChangedPayload) => void
): (() => void) => {
  const handler = (event: Event) => {
    callback((event as CustomEvent<BoardChangedPayload>).detail);
  };
  window.addEventListener(BOARD_CHANGED_EVENT, handler as EventListener);
  return () => window.removeEventListener(BOARD_CHANGED_EVENT, handler as EventListener);
};
