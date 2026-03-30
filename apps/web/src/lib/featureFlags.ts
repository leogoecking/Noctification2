export const isAprModuleEnabled = (): boolean =>
  import.meta.env.VITE_ENABLE_APR_MODULE === "true";

export const isKmlPosteModuleEnabled = (): boolean =>
  import.meta.env.VITE_ENABLE_KML_POSTE_MODULE === "true";
