import { request } from "./apiCore";

export const webPushApi = {
  webPushConfig: () =>
    request<{ enabled: boolean; vapidPublicKey: string | null }>("/me/web-push/config"),

  saveWebPushSubscription: (payload: unknown) =>
    request<{ ok: boolean }>("/me/web-push/subscription", {
      method: "PUT",
      bodyJson: payload
    }),

  removeWebPushSubscription: (endpoint: string) =>
    request<{ ok: boolean; removed: number }>("/me/web-push/subscription", {
      method: "DELETE",
      bodyJson: { endpoint }
    })
};
