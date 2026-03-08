import jwt from "jsonwebtoken";
import type { AppConfig } from "./config";
import type { JwtPayload, UserRole } from "./types";

export const createAccessToken = (
  config: AppConfig,
  params: { userId: number; role: UserRole }
): string => {
  return jwt.sign(
    {
      sub: params.userId,
      role: params.role
    },
    config.jwtSecret,
    {
      expiresIn: `${config.jwtExpiresHours}h`
    }
  );
};

export const verifyAccessToken = (config: AppConfig, token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    const subject =
      typeof decoded.sub === "number"
        ? decoded.sub
        : typeof decoded.sub === "string"
          ? Number(decoded.sub)
          : Number.NaN;

    if (!Number.isInteger(subject) || subject <= 0) {
      return null;
    }

    if (decoded.role !== "admin" && decoded.role !== "user") {
      return null;
    }

    return {
      sub: subject,
      role: decoded.role
    };
  } catch {
    return null;
  }
};
