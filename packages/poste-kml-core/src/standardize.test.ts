import { describe, expect, it } from "vitest";
import { standardizePosteKml } from "./standardize";

describe("standardizePosteKml", () => {
  it("mantém a ordem documental e padroniza pontos em pasta de postes", () => {
    const input = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Folder>
      <name>Postes</name>
      <Placemark>
        <name>P1</name>
        <Point><coordinates>-38.1,-12.9,0</coordinates></Point>
      </Placemark>
      <Placemark>
        <name>P2</name>
        <Point><coordinates>-38.2,-12.8,0</coordinates></Point>
      </Placemark>
    </Folder>
  </Document>
</kml>`;

    const result = standardizePosteKml(input, {
      prefix: "POSTE-TAF-",
      startAt: 7,
      mode: "folder-postes"
    });

    expect(result.summary.renamedCount).toBe(2);
    expect(result.mappings.map((item) => item.newName)).toEqual(["POSTE-TAF-07", "POSTE-TAF-08"]);
    expect(result.xml.indexOf("POSTE-TAF-07")).toBeLessThan(result.xml.indexOf("POSTE-TAF-08"));
  });

  it("ignora nomes explícitos e preserva itens fora do escopo", () => {
    const input = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Folder>
      <name>Rede</name>
      <Placemark>
        <name>Ignorar</name>
        <Point><coordinates>-38.1,-12.9,0</coordinates></Point>
      </Placemark>
      <Placemark>
        <name>Cabo troncal</name>
        <Point><coordinates>-38.2,-12.8,0</coordinates></Point>
      </Placemark>
    </Folder>
  </Document>
</kml>`;

    const result = standardizePosteKml(input, {
      prefix: "PX",
      ignoreNames: ["Ignorar"],
      mode: "auto"
    });

    expect(result.summary.renamedCount).toBe(0);
    expect(result.ignoredNames).toEqual(["Ignorar"]);
    expect(result.skippedNames).toEqual(["Cabo troncal"]);
  });
});
