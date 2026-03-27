export const APR_DB_KEY = "apr_control_local_v4";
export const APR_BACKUP_KEY = "apr_control_local_v4_backups";
export const APR_FIXED_BACKUP_FILE = "APR Control.json";
export const APR_SNAPSHOT_VERSION = 1;
export const APR_MAX_BACKUPS = 30;
export const APR_MAX_BACKUP_BYTES = 2_500_000;

export const DEFAULT_SUBJECTS = [
  "MANUTENÇÃO CAIXA NAP",
  "DOCUMENTAÇÃO FIBRA",
  "MANUTENCAO FIBRA - INFRA",
  "Mapeamento",
  "Podas"
] as const;

export const DEFAULT_EMPLOYEES = [
  "HARISSON LUCAS CRUZ RESENDE",
  "VENICIO DOS SANTOS LEAL",
  "RENAN MEDINA SCHULTZ",
  "FELIPE EDWIN SANTOS OLIVEIRA",
  "JOÃO PEDRO DO CARMO ALMEIDA"
] as const;

export const EMPLOYEE_TOKEN_IGNORES = new Set(["de", "da", "do", "das", "dos", "e"]);
