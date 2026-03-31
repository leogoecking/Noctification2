import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { OperationsBoardEventItem, OperationsBoardMessageItem } from "../types";

interface OperationsBoardRailProps {
  currentUserName: string;
  onError: (message: string) => void;
  onToast: (message: string) => void;
  title?: string;
  subtitle?: string;
}

const formatDate = (value: string | null) => {
  if (!value) {
    return "agora";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
};

export const OperationsBoardRail = ({
  currentUserName,
  onError,
  onToast,
  title = "Mural operacional",
  subtitle = "Recados compartilhados entre os usuarios"
}: OperationsBoardRailProps) => {
  const [messages, setMessages] = useState<OperationsBoardMessageItem[]>([]);
  const [selected, setSelected] = useState<OperationsBoardMessageItem | null>(null);
  const [timeline, setTimeline] = useState<OperationsBoardEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [form, setForm] = useState({ title: "", body: "" });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadMessages = useCallback(async () => {
    if (!mountedRef.current) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.myOperationsBoard("?status=active&limit=8");
      if (mountedRef.current) {
        setMessages(response.messages);
      }
    } catch (error) {
      if (mountedRef.current) {
        onError(error instanceof ApiError ? error.message : "Falha ao carregar mural operacional");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [onError]);

  const openMessage = async (message: OperationsBoardMessageItem) => {
    if (!mountedRef.current) {
      return;
    }

    setDetailLoading(true);
    try {
      const response = await api.myOperationsBoardMessage(message.id);
      if (mountedRef.current) {
        setSelected(response.message);
        setTimeline(response.timeline);
        setCommentDraft("");
      }
    } catch (error) {
      if (mountedRef.current) {
        onError(error instanceof ApiError ? error.message : "Falha ao carregar recado");
      }
    } finally {
      if (mountedRef.current) {
        setDetailLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const saveMessage = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      onError("Titulo e mensagem sao obrigatorios");
      return;
    }

    try {
      if (selected) {
        const response = await api.updateMyOperationsBoardMessage(selected.id, form);
        if (!mountedRef.current) {
          return;
        }

        setSelected(response.message);
        setMessages((prev) =>
          [response.message, ...prev.filter((item) => item.id !== response.message.id)].slice(0, 6)
        );
        await openMessage(response.message);
        if (mountedRef.current) {
          onToast("Recado atualizado");
        }
      } else {
        const response = await api.createMyOperationsBoardMessage(form);
        if (!mountedRef.current) {
          return;
        }

        setMessages((prev) => [response.message, ...prev].slice(0, 6));
        setForm({ title: "", body: "" });
        setComposerOpen(false);
        onToast("Recado publicado");
      }
    } catch (error) {
      if (mountedRef.current) {
        onError(error instanceof ApiError ? error.message : "Falha ao salvar recado");
      }
    }
  };

  const submitComment = async () => {
    if (!selected) {
      return;
    }

    if (!commentDraft.trim()) {
      onError("Escreva um comentario para registrar na timeline");
      return;
    }

    try {
      const response = await api.createMyOperationsBoardComment(selected.id, { body: commentDraft });
      if (!mountedRef.current) {
        return;
      }

      setTimeline((prev) => [response.event, ...prev]);
      setCommentDraft("");
      setMessages((prev) =>
        prev.map((item) =>
          item.id === selected.id
            ? {
                ...item,
                updatedAt: response.event.createdAt
              }
            : item
        )
      );
      onToast("Comentario registrado");
    } catch (error) {
      if (mountedRef.current) {
        onError(error instanceof ApiError ? error.message : "Falha ao comentar no mural");
      }
    }
  };

  const resolveSelected = async () => {
    if (!selected) {
      return;
    }

    try {
      const response = await api.updateMyOperationsBoardMessage(selected.id, { status: "resolved" });
      if (!mountedRef.current) {
        return;
      }

      setSelected(response.message);
      setMessages((prev) => prev.filter((item) => item.id !== response.message.id));
      await openMessage(response.message);
      if (mountedRef.current) {
        onToast("Recado encerrado");
      }
    } catch (error) {
      if (mountedRef.current) {
        onError(error instanceof ApiError ? error.message : "Falha ao encerrar recado");
      }
    }
  };

  return (
    <>
      <article
        className="overflow-hidden rounded-[1.5rem] border border-accent/20 bg-panel shadow-glow"
        data-testid="operations-board-rail"
      >
        <div className="border-b border-accent/15 bg-gradient-to-br from-accent/12 via-panel to-panel px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/12 text-accent ring-1 ring-accent/20">
                <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
                  <path
                    d="M4 6h16v9a3 3 0 0 1-3 3H9l-5 4V6Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-textMain">
                    {title}
                  </h3>
                  <span className="rounded-full bg-accent/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                    Global
                  </span>
                </div>
                <p className="mt-1 text-xs text-textMuted">{subtitle}</p>
              </div>
            </div>
            <button
              className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-xs font-semibold text-textMain transition hover:border-accent/40"
              onClick={() => {
                setSelected(null);
                setForm({ title: "", body: "" });
                setComposerOpen((current) => !current);
              }}
              type="button"
            >
              {composerOpen ? "Fechar" : "Novo"}
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-accent/15 bg-panel/80 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-textMain">Turno atual</p>
                <p className="mt-1 text-xs text-textMuted">
                  {messages.length} recado(s) ativos. Ultima leitura compartilhada entre a equipe.
                </p>
              </div>
              <span className="rounded-full bg-panelAlt px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-textMuted">
                {messages.length === 0 ? "Sem recados" : `${messages.length} ativos`}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5">
        {composerOpen && (
          <div className="mb-4 space-y-3 rounded-xl border border-outlineSoft bg-panelAlt p-3">
            <input
              className="w-full rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-sm text-textMain outline-none"
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Titulo do recado"
              value={form.title}
            />
            <textarea
              className="min-h-24 w-full rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-sm text-textMain outline-none"
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              placeholder="Escreva o contexto para o time"
              value={form.body}
            />
            <button
              className="btn-primary w-full"
              onClick={() => void saveMessage()}
              type="button"
            >
              Publicar recado
            </button>
          </div>
        )}

        <div className="space-y-3">
          {loading ? <p className="text-sm text-textMuted">Carregando mural...</p> : null}
          {!loading && messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outlineSoft bg-panelAlt p-4">
              <p className="text-sm text-textMuted">Nenhum recado ativo. Publique o primeiro aviso do turno.</p>
            </div>
          ) : null}

          {messages.map((message) => (
            <button
              key={message.id}
              className="block w-full rounded-[1.1rem] border border-outlineSoft/70 bg-panelAlt p-5 text-left transition hover:border-accent/35 hover:bg-panelAlt/80"
              onClick={() => void openMessage(message)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-textMain">{message.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-textMuted">{message.body}</p>
                </div>
                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                  {message.status === "active" ? "Ativo" : "Encerrado"}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-textMuted">
                {message.authorName} ({message.authorLogin}) • {formatDate(message.updatedAt)}
              </p>
            </button>
          ))}
        </div>
        </div>
      </article>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] bg-panel p-6 shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted">
                  Mural operacional
                </p>
                <h3 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-textMain">
                  {selected.title}
                </h3>
                <p className="mt-2 text-sm text-textMuted">
                  Publicado por {selected.authorName} ({selected.authorLogin}) •{" "}
                  {formatDate(selected.createdAt)}
                </p>
              </div>
              <button
                className="rounded-lg border border-outlineSoft bg-panelAlt px-3 py-2 text-xs text-textMain"
                onClick={() => setSelected(null)}
                type="button"
              >
                Fechar
              </button>
            </div>

            {detailLoading ? (
              <p className="mt-4 text-sm text-textMuted">Carregando detalhes...</p>
            ) : (
              <>
                <div className="mt-5 rounded-xl bg-panelAlt p-4">
                  <p className="whitespace-pre-wrap text-sm text-textMain">{selected.body}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-xs text-textMain"
                      onClick={() => {
                        setForm({ title: selected.title, body: selected.body });
                        setComposerOpen(false);
                      }}
                      type="button"
                    >
                      Preparar edicao
                    </button>
                    {selected.status === "active" ? (
                      <button
                        className="btn-warning text-xs"
                        onClick={() => void resolveSelected()}
                        type="button"
                      >
                        Encerrar recado
                      </button>
                    ) : null}
                  </div>
                </div>

                {form.title && form.body && (
                  <div className="mt-4 space-y-3 rounded-xl bg-panelAlt p-3">
                    <p className="text-xs font-semibold text-textMain">Edicao preparada</p>
                    <input
                      className="w-full rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-sm text-textMain outline-none"
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      value={form.title}
                    />
                    <textarea
                      className="min-h-24 w-full rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-sm text-textMain outline-none"
                      onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                      value={form.body}
                    />
                    <button
                      className="btn-primary w-full"
                      onClick={() => void saveMessage()}
                      type="button"
                    >
                      Salvar alteracoes
                    </button>
                  </div>
                )}

                <div className="mt-4 rounded-xl bg-panelAlt p-3">
                  <p className="text-xs font-semibold text-textMain">Comentario rapido</p>
                  <textarea
                    className="mt-3 min-h-20 w-full rounded-lg border border-outlineSoft bg-panel px-3 py-2 text-sm text-textMain outline-none"
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder={`Atualizacao de ${currentUserName}...`}
                    value={commentDraft}
                  />
                  <button
                    className="mt-3 w-full rounded-xl bg-panel px-4 py-3 text-sm font-semibold text-textMain"
                    onClick={() => void submitComment()}
                    type="button"
                  >
                    Registrar comentario
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">
                    Timeline
                  </p>
                  {timeline.map((event) => (
                    <div key={event.id} className="rounded-xl bg-panelAlt p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-textMain">
                          {event.actorName} ({event.actorLogin})
                        </p>
                        <span className="text-[11px] text-textMuted">{formatDate(event.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-textMuted">
                        {event.eventType}
                      </p>
                      {event.body ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-textMain">{event.body}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
