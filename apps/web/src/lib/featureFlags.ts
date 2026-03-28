export const isAprModuleEnabled = (): boolean =>
  import.meta.env.VITE_ENABLE_APR_MODULE === "true";
