import { normalizeText } from "./normalize.js";
export const buildRowMap = (rows) => {
    const result = new Map();
    for (const row of rows || []) {
        result.set(row.ID, row);
    }
    return result;
};
export const compareBases = (systemRows, manualRows) => {
    const systemMap = buildRowMap(systemRows);
    const manualMap = buildRowMap(manualRows);
    const ids = [...new Set([...systemMap.keys(), ...manualMap.keys()])].sort((a, b) => String(a).localeCompare(String(b), "pt-BR", { numeric: true }));
    const summary = {
        totalSistema: systemMap.size,
        totalManual: manualMap.size,
        conferido: 0,
        soSistema: 0,
        soManual: 0,
        totalIds: ids.length
    };
    const details = [];
    for (const id of ids) {
        const system = systemMap.get(id) ?? null;
        const manual = manualMap.get(id) ?? null;
        const changed = [];
        let status;
        if (system && manual) {
            status = "Conferido";
            summary.conferido++;
            if (system.dataAbertura !== manual.dataAbertura) {
                changed.push("Data de abertura");
            }
            if (normalizeText(system.assunto) !== normalizeText(manual.assunto)) {
                changed.push("Assunto");
            }
            if (normalizeText(system.colaborador) !== normalizeText(manual.colaborador)) {
                changed.push("Colaborador");
            }
        }
        else if (system) {
            status = "Só no sistema";
            summary.soSistema++;
        }
        else {
            status = "Só no manual";
            summary.soManual++;
        }
        details.push({ ID: id, status, changed, system, manual });
    }
    return { summary, details };
};
export const compareMonthToPrevious = (currentRows, previousRows) => {
    const currentMap = buildRowMap(currentRows);
    const previousMap = buildRowMap(previousRows);
    const ids = [...currentMap.keys()].sort((a, b) => String(a).localeCompare(String(b), "pt-BR", { numeric: true }));
    const summary = {
        totalAtual: currentMap.size,
        totalAnterior: previousMap.size,
        novo: 0,
        alterado: 0,
        semAlteracao: 0,
        totalIds: ids.length
    };
    const details = [];
    for (const id of ids) {
        const current = currentMap.get(id) ?? null;
        const previous = previousMap.get(id) ?? null;
        const changed = [];
        let status;
        if (!previous) {
            status = "Novo";
            summary.novo++;
        }
        else {
            if (current?.dataAbertura !== previous.dataAbertura) {
                changed.push("Data de abertura");
            }
            if (normalizeText(current?.assunto) !== normalizeText(previous.assunto)) {
                changed.push("Assunto");
            }
            if (normalizeText(current?.colaborador) !== normalizeText(previous.colaborador)) {
                changed.push("Colaborador");
            }
            if (changed.length) {
                status = "Alterado";
                summary.alterado++;
            }
            else {
                status = "Sem alteração";
                summary.semAlteracao++;
            }
        }
        details.push({ ID: id, status, changed, current, previous });
    }
    return { summary, details };
};
