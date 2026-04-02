import { request } from "./apiCore";

export const settingsApi = {
  getMySettings: (key: string) =>
    request<{ value: unknown }>(`/me/settings/${encodeURIComponent(key)}`),

  updateMySettings: (key: string, value: unknown) =>
    request<{ value: unknown }>(`/me/settings/${encodeURIComponent(key)}`, {
      method: "PUT",
      bodyJson: { value },
    }),
};
