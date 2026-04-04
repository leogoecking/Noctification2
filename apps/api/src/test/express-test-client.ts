import { IncomingMessage, ServerResponse } from "node:http";
import type { Socket } from "node:net";
import { Duplex } from "node:stream";
import type express from "express";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type DispatchRequestOptions = {
  method: HttpMethod;
  path: string;
  cookie?: string;
  body?: unknown;
  ip?: string;
  headers?: Record<string, string>;
};

export type DispatchResponse = {
  status: number;
  headers: Record<string, string | string[]>;
  text: string;
  body: unknown;
};

class MockSocket extends Duplex {
  readonly chunks: Buffer[] = [];
  remoteAddress: string;

  constructor(ip: string) {
    super();
    this.remoteAddress = ip;
  }

  _read() {}

  _write(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setTimeout() {}

  setNoDelay() {}

  setKeepAlive() {}

  destroy(error?: Error) {
    if (error) {
      this.emit("error", error);
    }

    this.emit("close");
    return this;
  }

  cork() {}

  uncork() {}
}

const normalizeRequestHeaders = (
  cookie: string | undefined,
  headers: Record<string, string>,
  body: string | undefined
): Record<string, string> => {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  if (cookie) {
    normalizedHeaders.cookie = cookie;
  }

  if (body !== undefined) {
    normalizedHeaders["content-type"] ??= "application/json";
    normalizedHeaders["content-length"] = Buffer.byteLength(body).toString();
  }

  return normalizedHeaders;
};

const parseResponseBody = (headers: Record<string, string | string[]>, text: string): unknown => {
  const contentType = headers["content-type"];
  const firstContentType = Array.isArray(contentType) ? contentType[0] : contentType;

  if (firstContentType?.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return text;
};

export const dispatchExpressRequest = async (
  app: express.Express,
  { method, path, cookie, body, ip = "127.0.0.1", headers = {} }: DispatchRequestOptions
): Promise<DispatchResponse> => {
  const socket = new MockSocket(ip);
  const nodeSocket = socket as unknown as Socket;
  const responseChunks: Buffer[] = [];
  const requestBody = body === undefined ? undefined : JSON.stringify(body);
  const req = new IncomingMessage(nodeSocket);

  req.method = method;
  req.url = path;
  req.headers = normalizeRequestHeaders(cookie, headers, requestBody);
  req.connection = nodeSocket;
  req.socket = nodeSocket;

  const res = new ServerResponse(req);
  res.assignSocket(nodeSocket);

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);

  res.write = ((chunk: string | Buffer | Uint8Array, encoding?: BufferEncoding, callback?: () => void) => {
    responseChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    if (encoding === undefined) {
      return originalWrite(chunk, callback);
    }

    return originalWrite(chunk, encoding, callback);
  }) as typeof res.write;

  res.end = ((
    chunk?: string | Buffer | Uint8Array,
    encoding?: BufferEncoding | (() => void),
    callback?: () => void
  ) => {
    if (chunk) {
      responseChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    if (typeof encoding === "function") {
      return originalEnd(chunk, encoding);
    }

    if (encoding === undefined) {
      return originalEnd(chunk, callback);
    }

    return originalEnd(chunk, encoding, callback);
  }) as typeof res.end;

  const response = new Promise<DispatchResponse>((resolve, reject) => {
    res.on("finish", () => {
      const text = Buffer.concat(responseChunks).toString("utf8");
      const rawHeaders = res.getHeaders();
      const responseHeaders = Object.fromEntries(
        Object.entries(rawHeaders).map(([key, value]) => {
          if (Array.isArray(value)) {
            return [key, value.map((item) => String(item))];
          }

          return [key, String(value)];
        })
      );

      resolve({
        status: res.statusCode,
        headers: responseHeaders,
        text,
        body: parseResponseBody(responseHeaders, text)
      });
    });
    res.on("error", reject);
  });

  const expressApp = app as express.Express & {
    handle: (req: express.Request, res: express.Response) => void;
  };

  expressApp.handle(req as express.Request, res as express.Response);

  if (requestBody !== undefined) {
    req.push(Buffer.from(requestBody));
  }

  req.push(null);

  return response;
};
