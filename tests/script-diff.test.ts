import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildScriptDiff, parseScriptText } from "../lib/script-parser";

const previousDraft = `
INT. WAREHOUSE - NIGHT

MAYA checks the hammer under a tarp.

MAYA
We move before sunrise.

EXT. DOCKS - DAWN

Rain hits the black van.
`;

const currentDraft = `
INT. SUBWAY PLATFORM - NIGHT

MAYA checks the hammer inside a locked transit case.

MAYA
We move before sunrise.

EXT. DOCKS - DAWN

Rain hits the black van.

INT. SAFEHOUSE - MORNING

ELIAS studies a wall of surveillance photos.
`;

describe("script diff engine", () => {
  it("ignores uppercase action fragments while keeping role descriptors", () => {
    const parsed = parseScriptText(`
EXT. FARM ROAD - DAY

AROUND THEM --

A FARMER steadies the gate as the truck turns.

BACK ON

MAYA
Keep moving.
`, {
      projectId: "project_a",
      versionName: "S-01 White",
      fileName: "parser.txt"
    });

    assert.deepEqual(parsed.characters, ["Farmer", "MAYA"]);
  });

  it("flags scene location changes and added scenes", () => {
    const previous = parseScriptText(previousDraft, {
      projectId: "project_a",
      versionName: "S-01 White",
      fileName: "previous.txt"
    });
    const current = parseScriptText(currentDraft, {
      projectId: "project_a",
      versionName: "S-02 Blue",
      fileName: "current.txt"
    });

    const diff = buildScriptDiff(previous, current);
    const sceneOne = diff.diffs.find((item) => item.sceneNumber === 1);

    assert.equal(diff.scenesAdded, 1);
    assert.equal(diff.locationsChanged >= 1, true);
    assert.equal(sceneOne?.status, "changed");
    assert.equal(sceneOne?.locationChanged, true);
    assert.ok(sceneOne?.productionImpact.some((impact) => impact.toLowerCase().includes("location")));
  });
});
