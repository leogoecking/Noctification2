import type { Response } from "express";

export const requireAuthUser = (
  authUser: { id: number; name: string; login: string } | undefined,
  res: Response
) => {
  if (!authUser) {
    res.status(401).json({ error: "Nao autenticado" });
    return null;
  }

  return authUser;
};

export const parsePositiveId = (value: string): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};
