# 03 - Achados Brutos

## ACH-KML-001

- Categoria: `melhoria`
- Evidencia:
  - O repositorio nao possuia `packages/poste-kml-core`.
  - Nao existia rota `POST /api/v1/kml-postes/standardize`.
  - Nao existia rota/navegacao admin `/kml-postes`.
- Impacto: impossibilitava a entrega da feature solicitada.

## ACH-KML-002

- Categoria: `risco_potencial`
- Evidencia:
  - O patch fornecido substituia `apps/api/src/app.ts` removendo a rota atual `operations-board`.
- Impacto: regressao potencial fora do escopo da feature.

## ACH-KML-003

- Categoria: `erro_de_configuracao`
- Evidencia:
  - Dependencias `adm-zip` e `@xmldom/xmldom` nao estavam instaladas.
- Impacto: build e execucao do modulo falhariam.

## ACH-KML-004

- Categoria: `problema_de_qualidade`
- Evidencia:
  - O novo export `isKmlPosteModuleEnabled` quebrou mocks antigos em `AdminDashboard.test.tsx`.
- Impacto: falha de suite web apos a integracao inicial.

## ACH-KML-005

- Categoria: `risco_potencial`
- Evidencia:
  - Prefixos com hifen final, como `POSTE-TAF-`, gerariam nome com duplo hifen se concatenados de forma literal.
- Impacto: nomenclatura incorreta nos arquivos gerados.
