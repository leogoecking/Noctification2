declare module "web-push" {
  interface PushSubscription {
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  interface PushResult {
    statusCode: number;
    body?: string;
    headers?: Record<string, string>;
  }

  interface VapidKeys {
    publicKey: string;
    privateKey: string;
  }

  interface WebPushModule {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
    generateVAPIDKeys(): VapidKeys;
    sendNotification(
      subscription: PushSubscription,
      payload?: string,
      options?: Record<string, unknown>
    ): Promise<PushResult>;
  }

  const webpush: WebPushModule;
  export = webpush;
}
