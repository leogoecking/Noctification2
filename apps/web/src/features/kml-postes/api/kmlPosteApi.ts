import { request } from "../../../lib/apiCore";

export interface KmlPosteMappingItem {
  sequence: number;
  oldName: string;
  newName: string;
  folderPath: string[];
  reason: string;
}

export interface KmlPosteSummary {
  mode: "auto" | "all-points" | "folder-postes";
  prefix: string;
  startAt: number;
  renamedCount: number;
  ignoredCount: number;
  skippedCount: number;
  totalPlacemarkCount: number;
  totalPointPlacemarkCount: number;
  nextValue: number;
}

export interface KmlPosteOutputs {
  kmlFileName: string;
  kmlBase64: string;
  kmzFileName: string;
  kmzBase64: string;
  csvFileName: string;
  csvBase64: string;
}

export interface KmlPosteStandardizeResponse {
  summary: KmlPosteSummary;
  mappings: KmlPosteMappingItem[];
  ignoredNames: string[];
  skippedNames: string[];
  outputs: KmlPosteOutputs;
}

export const kmlPosteApi = {
  standardizeKmlPostes: (payload: FormData) =>
    request<KmlPosteStandardizeResponse>("/kml-postes/standardize", {
      method: "POST",
      body: payload
    }),

  kmlPosteHealth: () => request<{ status: string; module: string }>("/kml-postes/health")
};
