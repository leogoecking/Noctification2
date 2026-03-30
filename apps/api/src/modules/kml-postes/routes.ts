import { promises as fs } from "node:fs";
import path from "node:path";
import { Router } from "express";
import formidable, { type Fields, type Files, type File } from "formidable";
import type Database from "better-sqlite3";
import AdmZip from "adm-zip";
import { standardizePosteKml, type DetectionMode } from "@noctification/poste-kml-core";
import type { AppConfig } from "../../config";
import { authenticate } from "../../middleware/auth";

const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;

const readFieldValue = (fields: Fields, key: string): string => {
  const raw = fields[key];
  if (Array.isArray(raw)) {
    return String(raw[0] ?? "").trim();
  }

  return String(raw ?? "").trim();
};

const getSingleFile = (files: Files, key: string): File | null => {
  const raw = files[key];
  if (Array.isArray(raw)) {
    return raw[0] ?? null;
  }

  return raw ?? null;
};

const parseMultipart = async (
  req: import("express").Request
): Promise<{ fields: Fields; files: Files }> => {
  const form = formidable({
    multiples: false,
    maxFiles: 1,
    maxFileSize: MAX_UPLOAD_SIZE
  });

  return await new Promise((resolve, reject) => {
    form.parse(req as never, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ fields, files });
    });
  });
};

const stripKnownExtension = (fileName: string): string =>
  fileName.replace(/(\.kmz)?\.kml$/i, "").replace(/\.kmz$/i, "");

const toCsvCell = (value: string): string => {
  const normalized = value.replace(/"/g, "\"\"");
  return `"${normalized}"`;
};

const buildMappingCsv = (
  mappings: Array<{
    sequence: number;
    oldName: string;
    newName: string;
    folderPath: string[];
    reason: string;
  }>
): string => {
  const header = ["sequence", "old_name", "new_name", "folder_path", "reason"];
  const lines = mappings.map((item) =>
    [
      String(item.sequence),
      toCsvCell(item.oldName),
      toCsvCell(item.newName),
      toCsvCell(item.folderPath.join(" / ")),
      toCsvCell(item.reason)
    ].join(",")
  );

  return [header.join(","), ...lines].join("\n");
};

const buildKmzBuffer = (entryName: string, xml: string, originalBuffer?: Buffer): Buffer => {
  if (!originalBuffer) {
    const zip = new AdmZip();
    zip.addFile(entryName, Buffer.from(xml, "utf-8"));
    return zip.toBuffer();
  }

  const sourceZip = new AdmZip(originalBuffer);
  const outputZip = new AdmZip();
  const entries = sourceZip.getEntries();

  for (const entry of entries) {
    if (entry.isDirectory) {
      outputZip.addFile(entry.entryName, Buffer.alloc(0));
      continue;
    }

    const data = entry.entryName === entryName ? Buffer.from(xml, "utf-8") : entry.getData();
    outputZip.addFile(entry.entryName, data);
  }

  return outputZip.toBuffer();
};

export const createKmlPosteRouter = (db: Database.Database, config: AppConfig) => {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      module: "kml-postes"
    });
  });

  router.use(authenticate(db, config));

  router.post("/standardize", async (req, res) => {
    try {
      const { fields, files } = await parseMultipart(req);
      const upload = getSingleFile(files, "file");

      if (!upload) {
        res.status(400).json({ error: "Arquivo obrigatorio" });
        return;
      }

      const prefix = readFieldValue(fields, "prefix");
      if (!prefix) {
        res.status(400).json({ error: "prefix obrigatorio" });
        return;
      }

      const modeValue = readFieldValue(fields, "mode");
      const mode: DetectionMode =
        modeValue === "all-points" || modeValue === "folder-postes" ? modeValue : "auto";

      const startAtRaw = Number(readFieldValue(fields, "startAt") || "1");
      const startAt = Number.isFinite(startAtRaw) && startAtRaw > 0 ? Math.floor(startAtRaw) : 1;
      const ignoreNames = readFieldValue(fields, "ignoreNames")
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);

      const inputBuffer = await fs.readFile(upload.filepath);
      const originalName = upload.originalFilename ?? "arquivo.kml";
      const extension = path.extname(originalName).toLowerCase();

      let sourceXml = "";
      let kmzEntryName = "doc.kml";
      let kmzSourceBuffer: Buffer | undefined;

      if (extension === ".kmz") {
        kmzSourceBuffer = inputBuffer;
        const zip = new AdmZip(inputBuffer);
        const targetEntry =
          zip
            .getEntries()
            .find((entry) => !entry.isDirectory && /(^|\/)doc\.kml$/i.test(entry.entryName)) ??
          zip
            .getEntries()
            .find((entry) => !entry.isDirectory && /\.kml$/i.test(entry.entryName));

        if (!targetEntry) {
          res.status(400).json({ error: "KMZ sem arquivo KML interno" });
          return;
        }

        kmzEntryName = targetEntry.entryName;
        sourceXml = targetEntry.getData().toString("utf-8");
      } else {
        sourceXml = inputBuffer.toString("utf-8");
      }

      const result = standardizePosteKml(sourceXml, {
        prefix,
        startAt,
        ignoreNames,
        mode
      });

      const baseName = stripKnownExtension(originalName);
      const kmlFileName = `${baseName} - PADRONIZADO.kml`;
      const kmzFileName = `${baseName} - PADRONIZADO.kmz`;
      const csvFileName = `${baseName} - MAPEAMENTO.csv`;
      const csvContent = buildMappingCsv(result.mappings);
      const kmlBuffer = Buffer.from(result.xml, "utf-8");
      const kmzBuffer = buildKmzBuffer(kmzEntryName, result.xml, kmzSourceBuffer);

      res.json({
        summary: result.summary,
        mappings: result.mappings,
        ignoredNames: result.ignoredNames,
        skippedNames: result.skippedNames,
        outputs: {
          kmlFileName,
          kmlBase64: kmlBuffer.toString("base64"),
          kmzFileName,
          kmzBase64: kmzBuffer.toString("base64"),
          csvFileName,
          csvBase64: Buffer.from(csvContent, "utf-8").toString("base64")
        }
      });
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Falha ao padronizar arquivo KML/KMZ" });
    }
  });

  return router;
};
