import type {
  OperationsBoardEventItem,
  OperationsBoardMessageItem
} from "../types";
import { request } from "./apiCore";

type OperationsBoardListResponse = {
  messages: OperationsBoardMessageItem[];
};

type OperationsBoardDetailResponse = {
  message: OperationsBoardMessageItem;
  timeline: OperationsBoardEventItem[];
};

type OperationsBoardCommentResponse = {
  event: OperationsBoardEventItem;
};

export const operationsBoardApi = {
  myOperationsBoard: (query = "") =>
    request<OperationsBoardListResponse>(`/me/operations-board${query}`),

  myOperationsBoardMessage: (id: number) =>
    request<OperationsBoardDetailResponse>(`/me/operations-board/${id}`),

  createMyOperationsBoardMessage: (payload: unknown) =>
    request<{ message: OperationsBoardMessageItem }>("/me/operations-board", {
      method: "POST",
      bodyJson: payload
    }),

  updateMyOperationsBoardMessage: (id: number, payload: unknown) =>
    request<{ message: OperationsBoardMessageItem }>(`/me/operations-board/${id}`, {
      method: "PATCH",
      bodyJson: payload
    }),

  createMyOperationsBoardComment: (id: number, payload: unknown) =>
    request<OperationsBoardCommentResponse>(`/me/operations-board/${id}/comments`, {
      method: "POST",
      bodyJson: payload
    })
};
