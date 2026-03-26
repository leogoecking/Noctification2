import type { Router } from "express";

export type MockResponse = {
  statusCode: number;
  body: unknown;
  sent: boolean;
  cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>;
  clearedCookies: Array<{ name: string; options?: Record<string, unknown> }>;
  headers: Record<string, string>;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
  send: (payload?: unknown) => MockResponse;
  cookie: (name: string, value: string, options?: Record<string, unknown>) => MockResponse;
  clearCookie: (name: string, options?: Record<string, unknown>) => MockResponse;
  setHeader: (name: string, value: string) => void;
};

export type MockRequest = {
  authUser?: {
    id: number;
    login: string;
    name: string;
    role: "admin" | "user";
  };
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
  ip?: string;
};

export type RouteHandle = (req: MockRequest, res: MockResponse, next?: () => void) => void;

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack: Array<{
      handle: unknown;
    }>;
  };
};

export const createMockResponse = (): MockResponse => {
  const response: MockResponse = {
    statusCode: 200,
    body: null,
    sent: false,
    cookies: [],
    clearedCookies: [],
    headers: {},
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(payload: unknown) {
      response.body = payload;
      response.sent = true;
      return response;
    },
    send(payload?: unknown) {
      response.body = payload ?? null;
      response.sent = true;
      return response;
    },
    cookie(name: string, value: string, options?: Record<string, unknown>) {
      response.cookies.push({ name, value, options });
      return response;
    },
    clearCookie(name: string, options?: Record<string, unknown>) {
      response.clearedCookies.push({ name, options });
      return response;
    },
    setHeader(name: string, value: string) {
      response.headers[name.toLowerCase()] = value;
    }
  };

  return response;
};

export const getRouteHandler = (router: Router, pathName: string, method: string): RouteHandle => {
  const routerWithStack = router as unknown as { stack: RouteLayer[] };
  const layer = routerWithStack.stack.find(
    (entry) => entry.route?.path === pathName && entry.route.methods?.[method] === true
  );

  if (!layer?.route) {
    throw new Error(`Rota nao encontrada: ${method.toUpperCase()} ${pathName}`);
  }

  const routeLayer = layer.route.stack[layer.route.stack.length - 1];
  if (!routeLayer) {
    throw new Error(`Metodo nao encontrado: ${method.toUpperCase()} ${pathName}`);
  }

  return routeLayer.handle as RouteHandle;
};
