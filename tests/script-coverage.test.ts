import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateLocalScriptCoverage } from "../lib/script-coverage";

const scriptText = `
EXT. FARM ROAD - DAY

A FARMER steadies the gate as MAYA runs toward the truck.

MAYA
Keep moving.

INT. BARN - NIGHT

The prototype case hums under a tarp.
`;

describe("script coverage", () => {
  it("creates a local coverage draft from extracted script text", () => {
    const coverage = generateLocalScriptCoverage({
      title: "Farm Road",
      writerName: "Writer",
      source: "Agency",
      fileName: "farm-road.pdf",
      versionNumber: 1,
      extractedText: scriptText
    });

    assert.equal(coverage.provider, "local");
    assert.equal(coverage.summary.mainCharacters.includes("MAYA"), true);
    assert.equal(coverage.summary.scoreDraft.overall >= 1, true);
    assert.equal(coverage.summary.scoreDraft.overall <= 10, true);
  });
});
