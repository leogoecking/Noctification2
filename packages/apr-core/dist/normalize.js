import { APR_DB_KEY, APR_SNAPSHOT_VERSION, DEFAULT_EMPLOYEES, EMPLOYEE_TOKEN_IGNORES } from "./constants.js";
const safeParseJson = (raw, fallback) => {
    try {
        return JSON.parse(raw);
    }
    catch {
        return fallback;
    }
};
export const normalizeText = (value) => String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
export const unwrapSpreadsheetFormulaText = (value) => {
    const raw = String(value ?? "").trim();
    const formulaTextMatch = raw.match(/^=\s*"([\s\S]*)"$/);
    if (!formulaTextMatch) {
        return raw;
    }
    return formulaTextMatch[1]?.replace(/""/g, '"').trim() ?? "";
};
export const normalizeHeader = (header) => normalizeText(header).toLowerCase();
export const normalizeSubjectPattern = (value) => {
    const clean = String(value ?? "").trim().replace(/\s+/g, " ");
    return clean ? clean.toLocaleUpperCase("pt-BR") : "";
};
export const isAprRecognitionExceptionSubject = (value) => normalizeText(value).toLowerCase() === "check list de pops";
export const employeeNameKey = (value) => normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export const employeeNameTokens = (value) => employeeNameKey(value)
    .split(" ")
    .filter((token) => token && !EMPLOYEE_TOKEN_IGNORES.has(token));
export const canonicalEmployeeMatch = (value) => {
    const raw = String(value ?? "").trim().replace(/\s+/g, " ");
    if (!raw) {
        return "";
    }
    const rawKey = employeeNameKey(raw);
    if (!rawKey) {
        return raw;
    }
    const rawTokens = employeeNameTokens(raw);
    const rawTokenSet = new Set(rawTokens);
    let best = null;
    for (const candidate of DEFAULT_EMPLOYEES) {
        const candidateKey = employeeNameKey(candidate);
        if (!candidateKey) {
            continue;
        }
        if (rawKey === candidateKey) {
            best = { name: candidate, score: 1 };
            break;
        }
        const candidateTokens = employeeNameTokens(candidate);
        if (!candidateTokens.length || !rawTokens.length) {
            continue;
        }
        let common = 0;
        for (const token of candidateTokens) {
            if (rawTokenSet.has(token)) {
                common++;
            }
        }
        const ratio = common / Math.max(rawTokens.length, candidateTokens.length);
        let score = ratio;
        if (rawKey.includes(candidateKey) || candidateKey.includes(rawKey)) {
            score = Math.max(score, 0.9);
        }
        if (common >= 2 && ratio >= 0.5) {
            score = Math.max(score, 0.8);
        }
        if (common >= 3 && ratio >= 0.6) {
            score = Math.max(score, 0.9);
        }
        if (!best || score > best.score) {
            best = { name: candidate, score };
        }
    }
    return best && best.score >= 0.8 ? best.name : raw;
};
export const normalizeEmployeeName = (value) => canonicalEmployeeMatch(value);
export const isValidIsoDate = (dateStr) => {
    const match = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        return false;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12) {
        return false;
    }
    const maxDay = new Date(year, month, 0).getDate();
    return day >= 1 && day <= maxDay;
};
const excelSerialDateToIso = (value) => {
    if (!Number.isFinite(value) || value <= 0) {
        return "";
    }
    const baseUtc = Date.UTC(1899, 11, 30);
    const date = new Date(baseUtc + Math.trunc(value) * 86400000);
    const iso = date.toISOString().slice(0, 10);
    return isValidIsoDate(iso) ? iso : "";
};
export const normalizeDateValue = (value) => {
    if (value === null || value === undefined || value === "") {
        return "";
    }
    if (typeof value === "number") {
        const isoFromNumber = excelSerialDateToIso(value);
        if (isoFromNumber) {
            return isoFromNumber;
        }
    }
    const raw = String(value).trim();
    const br = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:[ T].*)?$/);
    if (br) {
        const year = br[3].length === 2 ? `20${br[3]}` : br[3];
        const isoFromBr = `${year}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
        return isValidIsoDate(isoFromBr) ? isoFromBr : raw;
    }
    const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/);
    if (iso) {
        const normalized = `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
        return isValidIsoDate(normalized) ? normalized : raw;
    }
    const isoSlash = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:[ T].*)?$/);
    if (isoSlash) {
        const normalized = `${isoSlash[1]}-${isoSlash[2].padStart(2, "0")}-${isoSlash[3].padStart(2, "0")}`;
        return isValidIsoDate(normalized) ? normalized : raw;
    }
    const datePart = raw.match(/^(\d{4}-\d{1,2}-\d{1,2})T/);
    if (datePart) {
        const normalized = normalizeDateValue(datePart[1]);
        if (isValidIsoDate(normalized)) {
            return normalized;
        }
    }
    return raw;
};
export const formatDateBr = (value, emptyValue = "-") => {
    const iso = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
        return `${iso[3]}/${iso[2]}/${iso[1]}`;
    }
    const br = String(value ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) {
        return `${br[1]}/${br[2]}/${br[3]}`;
    }
    const raw = String(value ?? "").trim();
    return raw || emptyValue;
};
export const monthFromIsoDate = (dateStr) => isValidIsoDate(dateStr) ? String(dateStr).slice(0, 7) : "";
export const getPreviousMonth = (monthStr) => {
    if (!monthStr) {
        return "";
    }
    const [year, month] = monthStr.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};
export const sortAprRows = (rows) => rows.sort((a, b) => String(a.ID).localeCompare(String(b.ID), "pt-BR", { numeric: true }));
export const normalizeEntryShape = (entry) => {
    if (!entry || typeof entry !== "object") {
        return null;
    }
    const candidate = entry;
    const ID = String(candidate.ID ?? "").trim();
    if (!ID) {
        return null;
    }
    return {
        ID,
        dataAbertura: String(candidate.dataAbertura ?? "").trim(),
        assunto: String(candidate.assunto ?? "").trim(),
        colaborador: String(candidate.colaborador ?? "").trim()
    };
};
export const normalizeMonthPackShape = (pack) => {
    const candidate = pack;
    const manual = Array.isArray(candidate?.manual)
        ? candidate.manual.map(normalizeEntryShape).filter((item) => item !== null)
        : [];
    const system = Array.isArray(candidate?.system)
        ? candidate.system.map(normalizeEntryShape).filter((item) => item !== null)
        : [];
    const imports = candidate && typeof candidate.imports === "object" && !Array.isArray(candidate.imports)
        ? candidate.imports
        : {};
    return { manual, system, imports };
};
export const initialDb = (now = new Date().toISOString()) => ({
    months: {},
    meta: {
        createdAt: now,
        updatedAt: now
    }
});
export const normalizeDbShape = (db, now = new Date().toISOString()) => {
    const safe = initialDb(now);
    if (!db || typeof db !== "object") {
        return safe;
    }
    const candidate = db;
    const rawMonths = candidate.months && typeof candidate.months === "object" && !Array.isArray(candidate.months)
        ? candidate.months
        : {};
    for (const [month, pack] of Object.entries(rawMonths)) {
        if (!/^\d{4}-\d{2}$/.test(String(month))) {
            continue;
        }
        safe.months[month] = normalizeMonthPackShape(pack);
    }
    const rawMeta = candidate.meta && typeof candidate.meta === "object" && !Array.isArray(candidate.meta)
        ? candidate.meta
        : {};
    safe.meta.createdAt =
        typeof rawMeta.createdAt === "string" && rawMeta.createdAt ? rawMeta.createdAt : now;
    safe.meta.updatedAt =
        typeof rawMeta.updatedAt === "string" && rawMeta.updatedAt ? rawMeta.updatedAt : now;
    return safe;
};
export const parseDbString = (raw) => {
    if (typeof raw !== "string" || !raw.trim()) {
        return null;
    }
    const parsed = safeParseJson(raw, null);
    if (!parsed || typeof parsed !== "object") {
        return null;
    }
    return normalizeDbShape(parsed);
};
export const cloneDb = (db) => {
    try {
        return normalizeDbShape(JSON.parse(JSON.stringify(normalizeDbShape(db))));
    }
    catch {
        return normalizeDbShape(db);
    }
};
export const integrityChecksum = (at, reason, data) => {
    let hash = 2166136261;
    const input = `${APR_SNAPSHOT_VERSION}|${at}|${reason}|${data}|${APR_DB_KEY}`;
    for (let index = 0; index < input.length; index++) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
};
export const snapshotFromRaw = (data, reason, at) => {
    const safeAt = typeof at === "string" && at ? at : new Date().toISOString();
    const safeReason = String(reason ?? "");
    const safeData = String(data ?? "");
    return {
        v: APR_SNAPSHOT_VERSION,
        at: safeAt,
        reason: safeReason,
        data: safeData,
        checksum: integrityChecksum(safeAt, safeReason, safeData)
    };
};
export const normalizeSnapshotEnvelope = (item) => {
    if (!item || typeof item !== "object") {
        return null;
    }
    const candidate = item;
    if (typeof candidate.data !== "string" || !candidate.data) {
        return null;
    }
    const parsedDb = parseDbString(candidate.data);
    if (!parsedDb) {
        return null;
    }
    const at = typeof candidate.at === "string" && candidate.at ? candidate.at : new Date().toISOString();
    const reason = String(candidate.reason ?? "");
    const checksum = typeof candidate.checksum === "string" ? candidate.checksum : "";
    if (Number(candidate.v) === APR_SNAPSHOT_VERSION && checksum) {
        if (checksum !== integrityChecksum(at, reason, candidate.data)) {
            return null;
        }
        return {
            v: APR_SNAPSHOT_VERSION,
            at,
            reason,
            data: candidate.data,
            checksum
        };
    }
    return snapshotFromRaw(JSON.stringify(parsedDb), reason, at);
};
