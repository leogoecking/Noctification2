import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { OperationsBoardEventItem, OperationsBoardMessageItem } from "../types";
import { useOperationsBoardSocket } from "../hooks/useOperationsBoardSocket";
import type { BoardViewedPayload } from "../hooks/useOperationsBoardSocket";
import { CardAviso, FormNovoAviso } from "./operations-board/OperationsBoardCards";
import { OperationsBoardDetailSheet } from "./operations-board/OperationsBoardDetailSheet";
import {
  FILTROS,
  ROTACOES,
  appendViewerChip,
  buildInitialReactions,
  buildReadChips,
  getCategoryPalette,
  isDarkModeActive,
  type MuralCategoria,
  type MuralReaction,
  type MuralReadChip
} from "./operations-board/operationsBoardUi";

interface OperationsBoardRailProps {
  currentUserName: string;
  onError: (message: string) => void;
  onToast: (message: string) => void;
  title?: string;
  subtitle?: string;
}

export const OperationsBoardRail = ({
  currentUserName,
  onError,
  onToast,
  title = "Mural operacional",
  subtitle = "Recados compartilhados entre os usuarios"
}: OperationsBoardRailProps) => {
  const [darkMode, setDarkMode] = useState(isDarkModeActive);
  const [messages, setMessages] = useState<OperationsBoardMessageItem[]>([]);
  const [selected, setSelected] = useState<OperationsBoardMessageItem | null>(null);
  const [timeline, setTimeline] = useState<OperationsBoardEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formCategoria, setFormCategoria] = useState<MuralCategoria>("info");
  const [filtro, setFiltro] = useState<"todos" | MuralCategoria>("todos");
  const [reactionsById, setReactionsById] = useState<Record<number, MuralReaction[]>>({});
  const [readersById, setReadersById] = useState<Record<number, MuralReadChip[]>>({});
  const mountedRef = useRef(true);
  const viewerSeenRef = useRef<Record<number, Set<string>>>({});

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof MutationObserver === "undefined") {
      return;
    }

    const observer = new MutationObserver(() => {
      setDarkMode(isDarkModeActive());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });

    return () => observer.disconnect();
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

  const openMessage = useCallback(
    async (message: OperationsBoardMessageItem) => {
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
          const seed = new Set<string>();
          seed.add(`${response.message.authorName}:${response.message.authorLogin}`);
          response.timeline.forEach((event) => seed.add(`${event.actorName}:${event.actorLogin}`));
          viewerSeenRef.current[message.id] = seed;
          setReadersById((current) => ({
            ...current,
            [message.id]: buildReadChips(response.message, response.timeline)
          }));
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
    },
    [onError]
  );

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const handleBoardViewed = useCallback((payload: BoardViewedPayload) => {
    if (!mountedRef.current) {
      return;
    }

    const { messageId, actorName, actorLogin } = payload;
    const key = `${actorName}:${actorLogin}`;
    const seen = viewerSeenRef.current[messageId];
    if (!seen || seen.has(key)) {
      return;
    }

    seen.add(key);
    setReadersById((current) => {
      const chips = current[messageId];
      if (!chips) {
        return current;
      }

      return {
        ...current,
        [messageId]: appendViewerChip(chips, actorName, actorLogin)
      };
    });
  }, []);

  useOperationsBoardSocket({ onViewed: handleBoardViewed });

  const saveMessage = async () => {
    if (!formTitle.trim() || !formBody.trim()) {
      onError("Titulo e mensagem sao obrigatorios");
      return;
    }

    try {
      if (selected && !novoAberto) {
        const response = await api.updateMyOperationsBoardMessage(selected.id, {
          title: formTitle,
          body: formBody,
          category: formCategoria
        });

        if (!mountedRef.current) {
          return;
        }

        setSelected(response.message);
        setMessages((prev) =>
          [response.message, ...prev.filter((item) => item.id !== response.message.id)].slice(0, 8)
        );
        await openMessage(response.message);
        onToast("Recado atualizado");
        return;
      }

      const response = await api.createMyOperationsBoardMessage({
        title: formTitle,
        body: formBody,
        category: formCategoria
      });

      if (!mountedRef.current) {
        return;
      }

      setMessages((prev) => [response.message, ...prev].slice(0, 8));
      setReactionsById((current) => ({
        ...current,
        [response.message.id]: buildInitialReactions()
      }));
      viewerSeenRef.current[response.message.id] = new Set([
        `${response.message.authorName}:${response.message.authorLogin}`
      ]);
      setReadersById((current) => ({
        ...current,
        [response.message.id]: buildReadChips(response.message, [])
      }));
      setFormTitle("");
      setFormBody("");
      setFormCategoria("info");
      setNovoAberto(false);
      onToast("Recado publicado");
    } catch (error) {
      if (mountedRef.current) {
        onError(error instanceof ApiError ? error.message : "Falha ao salvar recado");
      }
    }
  };

  const prepareEdition = () => {
    if (!selected) {
      return;
    }

    setFormTitle(selected.title);
    setFormBody(selected.body);
    setFormCategoria(selected.category);
    setNovoAberto(false);
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
      const newTimeline = [response.event, ...timeline];
      const commentSeed = new Set<string>();
      commentSeed.add(`${selected.authorName}:${selected.authorLogin}`);
      newTimeline.forEach((event) => commentSeed.add(`${event.actorName}:${event.actorLogin}`));
      viewerSeenRef.current[selected.id] = commentSeed;
      setReadersById((current) => ({
        ...current,
        [selected.id]: buildReadChips(selected, newTimeline)
      }));
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
      onToast("Recado encerrado");
    } catch (error) {
      if (mountedRef.current) {
        onError(error instanceof ApiError ? error.message : "Falha ao encerrar recado");
      }
    }
  };

  const handleToggleReacao = (id: number, index: number) => {
    setReactionsById((current) => {
      const existing = current[id] ?? buildInitialReactions();

      return {
        ...current,
        [id]: existing.map((reaction, reactionIndex) => {
          if (reactionIndex !== index) {
            return reaction;
          }

          const ativo = !reaction.ativo;

          return {
            ...reaction,
            ativo,
            count: Math.max(0, reaction.count + (ativo ? 1 : -1))
          };
        })
      };
    });
  };

  const filteredMessages = useMemo(
    () => (filtro === "todos" ? messages : messages.filter((message) => message.category === filtro)),
    [filtro, messages]
  );

  const totalUrgentes = useMemo(
    () => messages.filter((message) => message.category === "urgente").length,
    [messages]
  );
  const totalVisualizacoes = useMemo(
    () => Object.values(readersById).reduce((acc, readers) => acc + readers.length, 0),
    [readersById]
  );
  const totalReacoes = useMemo(
    () =>
      messages.reduce(
        (acc, message) =>
          acc +
          (reactionsById[message.id] ?? buildInitialReactions()).reduce(
            (sum, reaction) => sum + reaction.count,
            0
          ),
        0
      ),
    [messages, reactionsById]
  );

  return (
    <>
      <article
        className="rounded-[1.5rem] border border-outlineSoft/70 bg-panel p-5 shadow-sm"
        data-testid="operations-board-rail"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#639922",
                animation: "livepulse 2s ease-in-out infinite"
              }}
            />
            <style>{`@keyframes livepulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{title}</div>
              <div className="mt-1 text-xs text-textMuted">{subtitle}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {totalUrgentes > 0 ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: getCategoryPalette("urgente", darkMode).bg,
                  color: getCategoryPalette("urgente", darkMode).bodyColor,
                  border: `0.5px solid ${getCategoryPalette("urgente", darkMode).border}`
                }}
              >
                {totalUrgentes} urgente{totalUrgentes > 1 ? "s" : ""}
              </span>
            ) : null}
            <span className="rounded-full border border-outlineSoft bg-panelAlt px-3 py-1 text-[11px] font-medium text-textMuted">
              {totalVisualizacoes} visualizações
            </span>
            <span className="rounded-full border border-outlineSoft bg-panelAlt px-3 py-1 text-[11px] font-medium text-textMuted">
              {totalReacoes} reações
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
          {FILTROS.map((item) => (
            <button
              key={item.key}
              onClick={() => setFiltro(item.key)}
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "4px 12px",
                borderRadius: 20,
                border: "0.5px solid rgba(0,0,0,0.12)",
                background: filtro === item.key ? "rgb(var(--color-text-main))" : "rgb(var(--color-panel-alt))",
                color: filtro === item.key ? "rgb(var(--color-panel))" : "rgb(var(--color-text-muted))",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s"
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => {
              setFormTitle("");
              setFormBody("");
              setFormCategoria("info");
              setNovoAberto((current) => !current);
            }}
            style={{
              marginLeft: "auto",
              fontSize: 12,
              fontWeight: 500,
              padding: "6px 16px",
              borderRadius: 20,
              border: "0.5px solid rgba(0,0,0,0.12)",
              background: novoAberto ? "rgb(var(--color-text-main))" : "rgb(var(--color-panel-alt))",
              color: novoAberto ? "rgb(var(--color-panel))" : "rgb(var(--color-text-main))",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s"
            }}
            type="button"
          >
            {novoAberto ? "× Cancelar" : "+ Novo aviso"}
          </button>
        </div>

        {novoAberto ? (
          <FormNovoAviso
            body={formBody}
            categoria={formCategoria}
            darkMode={darkMode}
            onBodyChange={setFormBody}
            onCancel={() => setNovoAberto(false)}
            onCategoryChange={setFormCategoria}
            onSave={() => void saveMessage()}
            onTitleChange={setFormTitle}
            title={formTitle}
          />
        ) : null}

        {loading ? <p className="text-sm text-textMuted">Carregando mural...</p> : null}
        {!loading && filteredMessages.length === 0 ? (
          <div className="py-10 text-center text-sm text-textMuted">Nenhum aviso nessa categoria.</div>
        ) : (
          <div style={{ columns: "2 17rem", columnGap: 12 }}>
            {filteredMessages.map((message, index) => (
              <div key={message.id} style={{ breakInside: "avoid" }}>
                <CardAviso
                  aviso={message}
                  categoria={message.category}
                  darkMode={darkMode}
                  onOpen={(item) => void openMessage(item)}
                  onToggleReacao={handleToggleReacao}
                  readers={readersById[message.id] ?? []}
                  reactions={reactionsById[message.id] ?? buildInitialReactions()}
                  rotacao={ROTACOES[index % ROTACOES.length]}
                />
              </div>
            ))}
          </div>
        )}
      </article>

      {selected ? (
        <OperationsBoardDetailSheet
          commentDraft={commentDraft}
          currentUserName={currentUserName}
          darkMode={darkMode}
          detailLoading={detailLoading}
          formBody={formBody}
          formTitle={formTitle}
          onClose={() => setSelected(null)}
          onCommentDraftChange={setCommentDraft}
          onFormBodyChange={setFormBody}
          onFormTitleChange={setFormTitle}
          onPrepareEdition={prepareEdition}
          onResolve={() => void resolveSelected()}
          onSave={() => void saveMessage()}
          onSubmitComment={() => void submitComment()}
          selected={selected}
          timeline={timeline}
        />
      ) : null}
    </>
  );
};
