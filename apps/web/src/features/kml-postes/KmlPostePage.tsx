import { useMemo, useState } from "react";
import { api, ApiError } from "../../lib/api";
import type { KmlPosteStandardizeResponse } from "./api/kmlPosteApi";

type DetectionMode = "auto" | "all-points" | "folder-postes";

interface KmlPostePageProps {
  onError: (message: string) => void;
  onToast: (message: string) => void;
}

const decodeBase64ToBlob = (base64: string, mimeType: string): Blob => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
};

const triggerDownload = (fileName: string, base64: string, mimeType: string) => {
  const blob = decodeBase64ToBlob(base64, mimeType);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const KmlPostePage = ({ onError, onToast }: KmlPostePageProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [prefix, setPrefix] = useState("POSTE-TAF-");
  const [startAt, setStartAt] = useState("1");
  const [mode, setMode] = useState<DetectionMode>("auto");
  const [ignoreNames, setIgnoreNames] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<KmlPosteStandardizeResponse | null>(null);

  const previewMappings = useMemo(() => result?.mappings.slice(0, 20) ?? [], [result]);

  const submit = async () => {
    if (!file) {
      onError("Selecione um arquivo KML ou KMZ");
      return;
    }

    const effectivePrefix = prefix.trim();
    if (!effectivePrefix) {
      onError("Informe o prefixo de nomenclatura");
      return;
    }

    const form = new FormData();
    form.set("file", file);
    form.set("prefix", effectivePrefix);
    form.set("startAt", startAt || "1");
    form.set("mode", mode);
    form.set("ignoreNames", ignoreNames);

    setIsSubmitting(true);

    try {
      const response = await api.standardizeKmlPostes(form);
      setResult(response);
      onToast(`Padronizacao concluida: ${response.summary.renamedCount} postes renomeados`);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Falha ao processar arquivo KML/KMZ";
      onError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[1.5rem] bg-panel p-5 shadow-glow">
        <div className="mb-4">
          <h2 className="font-display text-xl text-textMain">Padronizador de postes KML/KMZ</h2>
          <p className="mt-1 text-sm text-textMuted">
            Processa o arquivo, identifica placemarks de ponto e devolve KML, KMZ e CSV de
            mapeamento no mesmo fluxo.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm text-textMuted">Arquivo</span>
            <input
              accept=".kml,.kmz"
              className="block w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
              }}
              type="file"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm text-textMuted">Prefixo</span>
            <input
              className="block w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
              onChange={(event) => setPrefix(event.target.value)}
              placeholder="POSTE-TAF-U.R"
              value={prefix}
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm text-textMuted">Numero inicial</span>
            <input
              className="block w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
              min="1"
              onChange={(event) => setStartAt(event.target.value)}
              type="number"
              value={startAt}
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm text-textMuted">Modo de reconhecimento</span>
            <select
              className="block w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
              onChange={(event) => setMode(event.target.value as DetectionMode)}
              value={mode}
            >
              <option value="auto">Auto</option>
              <option value="all-points">Todos os pontos</option>
              <option value="folder-postes">Somente pasta Poste/Postes</option>
            </select>
          </label>
        </div>

        <label className="mt-4 block space-y-2">
          <span className="block text-sm text-textMuted">
            Ignorar nomes exatos (um por linha ou separados por virgula)
          </span>
          <textarea
            className="min-h-28 w-full rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-sm text-textMain"
            onChange={(event) => setIgnoreNames(event.target.value)}
            placeholder={"E.B-01\nMarcador especial"}
            value={ignoreNames}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            onClick={() => void submit()}
            type="button"
          >
            {isSubmitting ? "Processando..." : "Padronizar arquivo"}
          </button>

          {result ? (
            <>
              <button
                className="rounded-xl border border-outlineSoft bg-panelAlt px-4 py-2 text-sm text-textMain"
                onClick={() =>
                  triggerDownload(
                    result.outputs.kmlFileName,
                    result.outputs.kmlBase64,
                    "application/vnd.google-earth.kml+xml"
                  )
                }
                type="button"
              >
                Baixar KML
              </button>
              <button
                className="rounded-xl border border-outlineSoft bg-panelAlt px-4 py-2 text-sm text-textMain"
                onClick={() =>
                  triggerDownload(
                    result.outputs.kmzFileName,
                    result.outputs.kmzBase64,
                    "application/vnd.google-earth.kmz"
                  )
                }
                type="button"
              >
                Baixar KMZ
              </button>
              <button
                className="rounded-xl border border-outlineSoft bg-panelAlt px-4 py-2 text-sm text-textMain"
                onClick={() =>
                  triggerDownload(result.outputs.csvFileName, result.outputs.csvBase64, "text/csv")
                }
                type="button"
              >
                Baixar CSV
              </button>
            </>
          ) : null}
        </div>
      </div>

      {result ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-[1.5rem] bg-panel p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Renomeados</p>
              <p className="mt-2 text-2xl font-semibold text-textMain">
                {result.summary.renamedCount}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-panel p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Ignorados</p>
              <p className="mt-2 text-2xl font-semibold text-textMain">
                {result.summary.ignoredCount}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-panel p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Pulados</p>
              <p className="mt-2 text-2xl font-semibold text-textMain">
                {result.summary.skippedCount}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-panel p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Pontos</p>
              <p className="mt-2 text-2xl font-semibold text-textMain">
                {result.summary.totalPointPlacemarkCount}
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-panel p-5 shadow-glow">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg text-textMain">Previa das renomeacoes</h3>
                <p className="text-sm text-textMuted">
                  Mostrando as primeiras {previewMappings.length} entradas do mapeamento.
                </p>
              </div>
              <span className="rounded-xl border border-outlineSoft bg-panelAlt px-3 py-2 text-xs text-textMuted">
                modo: {result.summary.mode}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-outlineSoft text-left text-textMuted">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Nome antigo</th>
                    <th className="px-3 py-2 font-medium">Novo nome</th>
                    <th className="px-3 py-2 font-medium">Pasta</th>
                    <th className="px-3 py-2 font-medium">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {previewMappings.map((item) => (
                    <tr key={`${item.sequence}-${item.newName}`} className="border-b border-outlineSoft/60">
                      <td className="px-3 py-2 text-textMuted">{item.sequence}</td>
                      <td className="px-3 py-2 text-textMain">{item.oldName || "-"}</td>
                      <td className="px-3 py-2 font-medium text-accent">{item.newName}</td>
                      <td className="px-3 py-2 text-textMuted">
                        {item.folderPath.length > 0 ? item.folderPath.join(" / ") : "-"}
                      </td>
                      <td className="px-3 py-2 text-textMuted">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.ignoredNames.length > 0 ? (
              <div className="mt-4 rounded-xl border border-outlineSoft bg-panelAlt p-3">
                <p className="text-sm font-medium text-textMain">Ignorados</p>
                <p className="mt-1 text-sm text-textMuted">{result.ignoredNames.join(", ")}</p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
};
