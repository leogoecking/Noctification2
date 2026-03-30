import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type {
  DetectionMode,
  PosteMappingItem,
  StandardizePosteOptions,
  StandardizePosteResult
} from "./types.js";

const ZERO_WIDTH_PATTERN = /[\u200B-\u200D\uFEFF]/g;
const MARKER_NAME_PATTERN = /^(?:marcador\s*\d+|p\d+|\d+)$/i;
const EXCLUDED_KEYWORDS = [
  "nap",
  "splitter",
  "fusao",
  "fusão",
  "cabo",
  "cabos",
  "cliente",
  "clientes",
  "caixa",
  "fibra",
  "cto",
  "emenda",
  "dgo",
  "dio"
];
const POSTE_FOLDER_PATTERN = /\bposte(?:s)?\b/i;

const normalizeText = (value: string | null | undefined): string =>
  (value ?? "")
    .replace(ZERO_WIDTH_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeForCompare = (value: string | null | undefined): string =>
  normalizeText(value).toLowerCase();

const localNameOf = (node: Node | null | undefined): string =>
  ((node as Element | null)?.localName ?? (node as Element | null)?.nodeName ?? "")
    .split(":")
    .pop()
    ?.trim() ?? "";

const isElementNode = (node: Node | null | undefined): node is Element =>
  Boolean(node) && node?.nodeType === node?.ELEMENT_NODE;

const getDirectChildElement = (element: Element, tagName: string): Element | null => {
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const child = element.childNodes.item(index);
    if (isElementNode(child) && localNameOf(child) === tagName) {
      return child;
    }
  }

  return null;
};

const getDirectChildText = (element: Element, tagName: string): string => {
  const child = getDirectChildElement(element, tagName);
  return normalizeText(child?.textContent);
};

const setDirectChildText = (element: Element, tagName: string, value: string): void => {
  const child = getDirectChildElement(element, tagName);
  if (child) {
    child.textContent = value;
    return;
  }

  const doc = element.ownerDocument;
  const created = doc.createElement(tagName);
  created.appendChild(doc.createTextNode(value));

  if (element.firstChild) {
    element.insertBefore(created, element.firstChild);
  } else {
    element.appendChild(created);
  }
};

const collectDescendants = (element: Element): Element[] => {
  const items: Element[] = [];

  const visit = (current: Element) => {
    for (let index = 0; index < current.childNodes.length; index += 1) {
      const child = current.childNodes.item(index);
      if (!isElementNode(child)) {
        continue;
      }

      items.push(child);
      visit(child);
    }
  };

  visit(element);
  return items;
};

const hasDescendantTag = (element: Element, tagName: string): boolean =>
  collectDescendants(element).some((child) => localNameOf(child) === tagName);

const getFolderPath = (element: Element): string[] => {
  const folders: string[] = [];
  let current = element.parentNode;

  while (current) {
    if (isElementNode(current) && localNameOf(current) === "Folder") {
      const folderName = getDirectChildText(current, "name");
      if (folderName) {
        folders.unshift(folderName);
      }
    }

    current = current.parentNode;
  }

  return folders;
};

const getPlacemarkElementsInDocumentOrder = (doc: Document): Element[] => {
  const items: Element[] = [];
  const root = doc.documentElement;

  const visit = (current: Element) => {
    if (localNameOf(current) === "Placemark") {
      items.push(current);
    }

    for (let index = 0; index < current.childNodes.length; index += 1) {
      const child = current.childNodes.item(index);
      if (isElementNode(child)) {
        visit(child);
      }
    }
  };

  visit(root);
  return items;
};

const buildName = (prefix: string, value: number, minPadding: number): string => {
  const targetPadding = Math.max(minPadding, value >= 100 ? String(value).length : 2);
  const sanitizedPrefix = prefix.replace(/[-\s]+$/, "");
  return `${sanitizedPrefix}-${String(value).padStart(targetPadding, "0")}`;
};

interface PlacemarkDecision {
  shouldRename: boolean;
  ignored: boolean;
  reason: string;
  oldName: string;
  folderPath: string[];
  isPointPlacemark: boolean;
}

const decidePlacemark = (
  placemark: Element,
  mode: DetectionMode,
  ignoredNames: Set<string>
): PlacemarkDecision => {
  const oldName = getDirectChildText(placemark, "name");
  const normalizedName = normalizeForCompare(oldName);
  const folderPath = getFolderPath(placemark);
  const pathText = folderPath.join(" ");
  const description = getDirectChildText(placemark, "description");
  const combinedText = [oldName, description, pathText].join(" ");
  const combinedNormalized = normalizeForCompare(combinedText);
  const isPointPlacemark = hasDescendantTag(placemark, "Point");
  const hasExcludedGeometry =
    hasDescendantTag(placemark, "LineString") ||
    hasDescendantTag(placemark, "Polygon") ||
    hasDescendantTag(placemark, "Model") ||
    hasDescendantTag(placemark, "Track");

  if (!isPointPlacemark || hasExcludedGeometry) {
    return {
      shouldRename: false,
      ignored: false,
      reason: "nao-e-poste",
      oldName,
      folderPath,
      isPointPlacemark
    };
  }

  if (normalizedName && ignoredNames.has(normalizedName)) {
    return {
      shouldRename: false,
      ignored: true,
      reason: "ignorado",
      oldName,
      folderPath,
      isPointPlacemark
    };
  }

  if (mode === "all-points") {
    return {
      shouldRename: true,
      ignored: false,
      reason: "todos-os-pontos",
      oldName,
      folderPath,
      isPointPlacemark
    };
  }

  const pathHasPoste = POSTE_FOLDER_PATTERN.test(pathText);
  const hasExcludedKeyword = EXCLUDED_KEYWORDS.some((keyword) =>
    combinedNormalized.includes(keyword)
  );

  if (mode === "folder-postes") {
    return {
      shouldRename: pathHasPoste,
      ignored: false,
      reason: pathHasPoste ? "pasta-postes" : "fora-da-pasta-postes",
      oldName,
      folderPath,
      isPointPlacemark
    };
  }

  if (hasExcludedKeyword) {
    return {
      shouldRename: false,
      ignored: false,
      reason: "palavra-excluida",
      oldName,
      folderPath,
      isPointPlacemark
    };
  }

  if (pathHasPoste || MARKER_NAME_PATTERN.test(normalizeText(oldName))) {
    return {
      shouldRename: true,
      ignored: false,
      reason: pathHasPoste ? "pasta-postes" : "padrao-de-marcador",
      oldName,
      folderPath,
      isPointPlacemark
    };
  }

  return {
    shouldRename: true,
    ignored: false,
    reason: "ponto-valido",
    oldName,
    folderPath,
    isPointPlacemark
  };
};

export const standardizePosteKml = (
  xml: string,
  options: StandardizePosteOptions
): StandardizePosteResult => {
  const prefix = normalizeText(options.prefix);
  if (!prefix) {
    throw new Error("prefix obrigatorio");
  }

  const parser = new DOMParser({
    errorHandler: {
      warning: () => undefined,
      error: () => undefined,
      fatalError: () => undefined
    }
  });

  const doc = parser.parseFromString(xml, "application/xml");
  const placemarks = getPlacemarkElementsInDocumentOrder(doc);
  const mode = options.mode ?? "auto";
  const ignoredNames = new Set((options.ignoreNames ?? []).map((item) => normalizeForCompare(item)));
  const startAt = Number.isFinite(options.startAt) ? Math.max(1, Number(options.startAt)) : 1;
  const minPadding = Math.max(2, options.minPadding ?? 2);

  let nextValue = startAt;
  const mappings: PosteMappingItem[] = [];
  const ignored: string[] = [];
  const skipped: string[] = [];
  let pointPlacemarkCount = 0;

  for (const placemark of placemarks) {
    const decision = decidePlacemark(placemark, mode, ignoredNames);
    if (decision.isPointPlacemark) {
      pointPlacemarkCount += 1;
    }

    if (decision.ignored) {
      if (decision.oldName) {
        ignored.push(decision.oldName);
      }
      continue;
    }

    if (!decision.shouldRename) {
      if (decision.oldName) {
        skipped.push(decision.oldName);
      }
      continue;
    }

    const newName = buildName(prefix, nextValue, minPadding);
    setDirectChildText(placemark, "name", newName);

    mappings.push({
      sequence: nextValue,
      oldName: decision.oldName,
      newName,
      folderPath: decision.folderPath,
      reason: decision.reason
    });

    nextValue += 1;
  }

  const serializer = new XMLSerializer();
  const serialized = serializer.serializeToString(doc);

  return {
    xml: serialized,
    mappings,
    ignoredNames: ignored,
    skippedNames: skipped,
    summary: {
      mode,
      prefix,
      startAt,
      renamedCount: mappings.length,
      ignoredCount: ignored.length,
      skippedCount: skipped.length,
      totalPlacemarkCount: placemarks.length,
      totalPointPlacemarkCount: pointPlacemarkCount,
      nextValue
    }
  };
};
