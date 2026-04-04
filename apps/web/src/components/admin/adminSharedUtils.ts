export const formatDate = (value: string | null): string => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR");
};
