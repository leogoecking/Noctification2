import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../lib/api";
import { aprApi } from "./api";
import type { AprCollaboratorSuggestion, AprSubjectSuggestion } from "./types";

interface UseAprCatalogDataParams {
  onError: (message: string) => void;
}

interface AprCatalogDataState {
  subjectSuggestions: AprSubjectSuggestion[];
  collaboratorSuggestions: AprCollaboratorSuggestion[];
}

const EMPTY_CATALOG_STATE: AprCatalogDataState = {
  subjectSuggestions: [],
  collaboratorSuggestions: []
};

export const useAprCatalogData = ({ onError }: UseAprCatalogDataParams) => {
  const requestIdRef = useRef(0);
  const [catalogState, setCatalogState] = useState<AprCatalogDataState>(EMPTY_CATALOG_STATE);

  const loadCatalogData = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      const [subjectsResponse, collaboratorsResponse] = await Promise.all([
        aprApi.listSubjects(),
        aprApi.listCollaborators()
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setCatalogState({
        subjectSuggestions: subjectsResponse.subjects,
        collaboratorSuggestions: collaboratorsResponse.collaborators
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      onError(error instanceof ApiError ? error.message : "Falha ao carregar catalogos APR");
    }
  }, [onError]);

  useEffect(() => {
    void loadCatalogData();
  }, [loadCatalogData]);

  return {
    ...catalogState,
    loadCatalogData
  };
};
