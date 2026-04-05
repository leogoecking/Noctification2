import type { MuralCategory } from "./operations-board-types";
import { VALID_CATEGORIES } from "./operations-board-types";

export const parseMuralCategory = (value: unknown): MuralCategory | undefined => {
  if (typeof value === "string" && (VALID_CATEGORIES as string[]).includes(value)) {
    return value as MuralCategory;
  }

  return undefined;
};

export const parseOperationsBoardStatus = (
  value: unknown
): "active" | "resolved" | undefined => {
  if (value === "active" || value === "resolved") {
    return value;
  }

  return undefined;
};
