export type DetectionMode = "auto" | "all-points" | "folder-postes";
export interface StandardizePosteOptions {
    prefix: string;
    startAt?: number;
    ignoreNames?: string[];
    mode?: DetectionMode;
    minPadding?: number;
}
export interface PosteMappingItem {
    sequence: number;
    oldName: string;
    newName: string;
    folderPath: string[];
    reason: string;
}
export interface StandardizePosteSummary {
    mode: DetectionMode;
    prefix: string;
    startAt: number;
    renamedCount: number;
    ignoredCount: number;
    skippedCount: number;
    totalPlacemarkCount: number;
    totalPointPlacemarkCount: number;
    nextValue: number;
}
export interface StandardizePosteResult {
    xml: string;
    mappings: PosteMappingItem[];
    ignoredNames: string[];
    skippedNames: string[];
    summary: StandardizePosteSummary;
}
