import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeClaudeBreakdownElementsForTest, normalizeClaudeBreakdownScenesForTest } from "../lib/production-breakdown";

describe("production breakdown Claude parsing", () => {
  it("salvages valid breakdown rows from malformed Claude JSON text", () => {
    const malformed = `{
      "elements": [
        {"id":"char-maya","category":"char","name":"MAYA","sceneNumber":"1","sceneHeading":"INT. BARN - NIGHT"},
        {"id":"prop-prototype-case","category":"prop","name":"Prototype Case","sceneNumber":"1","sceneHeading":"INT. BARN - NIGHT"}
        {"id":"location-barn","category":"location","name":"Barn","sceneNumber":"1","sceneHeading":"INT. BARN - NIGHT"}
      ]
    }`;

    const elements = normalizeClaudeBreakdownElementsForTest(malformed);

    assert.equal(elements.length, 3);
    assert.deepEqual(elements.map((element) => element.displayName), ["MAYA", "Prototype Case", "Barn"]);
  });

  it("rejects categories outside the uploaded production-breakdown taxonomy", () => {
    const payload = { elements: [{ category: "vfx", name: "Digital sky replacement" }] };

    assert.throws(
      () => normalizeClaudeBreakdownElementsForTest(payload),
      /unsupported production-breakdown category/i
    );
  });

  it("merges repeated skill ids into one element", () => {
    const payload = {
      elements: [
        { id: "char-maya", category: "char", name: "MAYA", sceneNumber: "1", sceneHeading: "INT. BARN - NIGHT" },
        { id: "char-maya", category: "char", name: "MAYA", sceneNumber: "2", sceneHeading: "EXT. FIELD - DAY" }
      ]
    };

    const elements = normalizeClaudeBreakdownElementsForTest(payload);

    assert.equal(elements.length, 1);
    assert.equal(elements[0]?.displayName, "MAYA");
  });

  it("keeps a dedicated scene list from Claude skill output", () => {
    const payload = {
      scenes: [
        {
          sceneNumber: "1",
          page: 1,
          intExt: "INT",
          location: "CAR",
          timeOfDay: "DAY",
          sceneHeading: "INT. CAR - DAY",
          synopsis: "Grant drives while old-time doo-wop plays.",
          elementIds: ["char-grant"]
        }
      ],
      elements: [{ id: "char-grant", category: "char", name: "GRANT", sceneNumber: "1", sceneHeading: "INT. CAR - DAY" }]
    };

    const scenes = normalizeClaudeBreakdownScenesForTest(payload);

    assert.equal(scenes.length, 1);
    assert.equal(scenes[0]?.sceneHeading, "INT. CAR - DAY");
    assert.deepEqual(scenes[0]?.elementIds, ["char-grant"]);
  });
});
