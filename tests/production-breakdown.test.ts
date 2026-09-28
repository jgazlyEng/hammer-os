import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeClaudeBreakdownElementsForTest } from "../lib/production-breakdown";

describe("production breakdown Claude parsing", () => {
  it("salvages valid breakdown rows from malformed Claude JSON text", () => {
    const malformed = `{
      "elements": [
        {"category":"CHARACTER","name":"MAYA","sceneNumber":"1","sceneHeading":"INT. BARN - NIGHT"},
        {"category":"PROP","name":"Prototype Case","sceneNumber":"1","sceneHeading":"INT. BARN - NIGHT"}
        {"category":"LOCATION","name":"Barn","sceneNumber":"1","sceneHeading":"INT. BARN - NIGHT"}
      ]
    }`;

    const elements = normalizeClaudeBreakdownElementsForTest(malformed);

    assert.equal(elements.length, 3);
    assert.deepEqual(elements.map((element) => element.displayName), ["MAYA", "Prototype Case", "Barn"]);
  });
});
