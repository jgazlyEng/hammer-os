import type { ParsedScriptScene, ParsedScriptVersion, RiskLevel, SceneProductionDiff, ScriptProductionDiff } from "@/lib/types";

const propLexicon = [
  "prototype case",
  "case",
  "tracker",
  "data key",
  "hammer rig",
  "magnetic hammer",
  "pistol",
  "rifle",
  "knife",
  "phone",
  "badge",
  "keycard",
  "drone",
  "zipline rig",
  "train doors",
  "third rail",
  "metro signage",
  "armored convoy"
];

const stuntLexicon = ["fight", "fall", "jump", "crash", "chase", "tackle", "explodes", "collapse", "stunt", "sprint", "dives", "slides"];
const vfxLexicon = ["explosion", "smoke", "fire", "molten", "digital", "screen", "drone", "train", "collapse", "sparks", "rig", "plate"];
const timeTokens = ["DAY", "NIGHT", "DAWN", "DUSK", "CONTINUOUS", "MORNING", "AFTERNOON", "EVENING", "LATER", "SAME TIME", "MOMENTS LATER"];
const characterCueStopWords = [
  "ABOVE",
  "ACROSS",
  "AFTER",
  "AROUND",
  "BACK",
  "BEHIND",
  "BELOW",
  "CUT",
  "CUT TO",
  "FADE IN",
  "FADE OUT",
  "INTO",
  "LATER",
  "MEANWHILE",
  "NEAR",
  "ON",
  "OFF",
  "OVER",
  "OUTSIDE",
  "THEN",
  "THROUGH",
  "UNDER",
  "WITH"
];
const characterDescriptorLexicon = [
  "agent",
  "artist",
  "bartender",
  "boy",
  "captain",
  "child",
  "clerk",
  "contractor",
  "cop",
  "detective",
  "doctor",
  "driver",
  "executive",
  "farmer",
  "foreman",
  "girl",
  "guard",
  "kid",
  "lawyer",
  "man",
  "medic",
  "mother",
  "nurse",
  "officer",
  "pilot",
  "producer",
  "ranger",
  "reporter",
  "scientist",
  "soldier",
  "stranger",
  "teacher",
  "technician",
  "vendor",
  "waiter",
  "woman",
  "writer"
];

const sampleScript = `TITLE: HAMMER

EXT. QUARRY ROAD - NIGHT

An armored convoy crawls through rain. MARA watches from the ridge as HOLT checks the prototype case.

MARA
We take the case, not the truck.

The lead vehicle crashes into a quarry barricade. Sparks skip across the wet road.

INT. SAFEHOUSE - DAWN

MARA finds a tracker under the metal table. HOLT palms a second tracker before she can see it.

HOLT
You were never supposed to know about that.

INT. SUBWAY PLATFORM - NIGHT

Crowd extras flood the platform. The prototype case slides toward the third rail as train doors open.

MARA
Holt, do not move.

A transit cop sees the pistol. The arriving train masks a fight near the tunnel stairs.

INT. SUBWAY TRAIN - CONTINUOUS

MARA fights through the aisle as HOLT loses the case between cars. A phone screen flashes the data key route.

EXT. ROOFTOP - NIGHT

A drone drops the data key toward a zipline rig. MARA jumps across the billboard catwalk.

INT. FOUNDRY FLOOR - NIGHT

The magnetic hammer rig tears loose. Molten sparks flare as the catwalk collapses.

EXT. FLOOD CHANNEL - DAWN

MARA burns the tracker and leaves the prototype case behind.`;

export const sampleScriptText = sampleScript;

export function parseScriptText(input: string, options: { projectId: string; versionName: string; fileName: string }): ParsedScriptVersion {
  const text = normalizeScriptText(input);
  const rawScenes = splitIntoScenes(text);
  const scenes = rawScenes.map((rawScene, index) => parseScene(rawScene.slugline, rawScene.body, index + 1));

  return {
    id: slugify(`${options.projectId}-${options.versionName}-${options.fileName}`),
    projectId: options.projectId,
    versionName: options.versionName,
    fileName: options.fileName,
    uploadedAt: new Date().toISOString(),
    scenes,
    characters: uniqueSorted(scenes.flatMap((scene) => scene.characters)),
    environments: uniqueSorted(scenes.flatMap((scene) => scene.environments)),
    props: uniqueSorted(scenes.flatMap((scene) => scene.props)),
    stuntBeats: scenes.flatMap((scene) => scene.stuntBeats),
    vfxBeats: scenes.flatMap((scene) => scene.vfxBeats)
  };
}

export function parseFdxText(input: string, options: { projectId: string; versionName: string; fileName: string }) {
  if (typeof window === "undefined") {
    return parseScriptText(input, options);
  }

  const doc = new window.DOMParser().parseFromString(input, "application/xml");
  const paragraphs = Array.from(doc.querySelectorAll("Paragraph"));
  const lines = paragraphs
    .map((paragraph) => {
      const type = paragraph.getAttribute("Type");
      const content = Array.from(paragraph.querySelectorAll("Text")).map((node) => node.textContent ?? "").join("");
      if (!content.trim()) return "";
      if (type === "Scene Heading") return content.toUpperCase();
      if (type === "Character") return `\n${content.toUpperCase()}`;
      return content;
    })
    .filter(Boolean)
    .join("\n\n");

  return parseScriptText(lines, options);
}

export function buildScriptDiff(previous: ParsedScriptVersion, current: ParsedScriptVersion): ScriptProductionDiff {
  const previousByNumber = new Map(previous.scenes.map((scene) => [scene.number, scene]));
  const currentByNumber = new Map(current.scenes.map((scene) => [scene.number, scene]));
  const sceneNumbers = uniqueSorted([...previous.scenes.map((scene) => String(scene.number)), ...current.scenes.map((scene) => String(scene.number))]).map(Number);

  const diffs = sceneNumbers.map((sceneNumber) => {
    const before = previousByNumber.get(sceneNumber);
    const after = currentByNumber.get(sceneNumber);
    return buildSceneDiff(sceneNumber, before, after);
  });

  const changedDiffs = diffs.filter((diff) => diff.status === "changed" || diff.status === "added" || diff.status === "removed");

  return {
    fromVersion: previous.versionName,
    toVersion: current.versionName,
    scenesAdded: diffs.filter((diff) => diff.status === "added").length,
    scenesRemoved: diffs.filter((diff) => diff.status === "removed").length,
    scenesChanged: diffs.filter((diff) => diff.status === "changed").length,
    locationsChanged: diffs.filter((diff) => diff.locationChanged).length,
    charactersAdded: uniqueSorted(changedDiffs.flatMap((diff) => diff.charactersAdded)),
    propsAdded: uniqueSorted(changedDiffs.flatMap((diff) => diff.propsAdded)),
    highRiskChanges: changedDiffs.filter((diff) => diff.riskLevel === "high" || diff.riskLevel === "critical").length,
    diffs
  };
}

function buildSceneDiff(sceneNumber: number, before?: ParsedScriptScene, after?: ParsedScriptScene): SceneProductionDiff {
  if (!before && after) {
    const impact = inferProductionImpact(after, true);
    return {
      id: `scene-${sceneNumber}-added`,
      status: "added",
      sceneNumber,
      afterSlugline: after.slugline,
      locationChanged: true,
      charactersAdded: after.characters,
      charactersRemoved: [],
      propsAdded: after.props,
      propsRemoved: [],
      environmentsAdded: after.environments,
      environmentsRemoved: [],
      productionImpact: impact,
      riskLevel: inferRisk(impact, after)
    };
  }

  if (before && !after) {
    return {
      id: `scene-${sceneNumber}-removed`,
      status: "removed",
      sceneNumber,
      beforeSlugline: before.slugline,
      locationChanged: true,
      charactersAdded: [],
      charactersRemoved: before.characters,
      propsAdded: [],
      propsRemoved: before.props,
      environmentsAdded: [],
      environmentsRemoved: before.environments,
      productionImpact: ["Story continuity review", "Schedule board update", "Linked previz/storyboards may be retired"],
      riskLevel: "medium"
    };
  }

  if (!before || !after) {
    throw new Error("Scene diff requires at least one scene.");
  }

  const charactersAdded = difference(after.characters, before.characters);
  const charactersRemoved = difference(before.characters, after.characters);
  const propsAdded = difference(after.props, before.props);
  const propsRemoved = difference(before.props, after.props);
  const environmentsAdded = difference(after.environments, before.environments);
  const environmentsRemoved = difference(before.environments, after.environments);
  const locationChanged = before.location !== after.location || before.interiorExterior !== after.interiorExterior;
  const textChanged = compactText(before.text) !== compactText(after.text);
  const status = locationChanged || textChanged || charactersAdded.length || charactersRemoved.length || propsAdded.length || propsRemoved.length ? "changed" : "stable";
  const productionImpact = status === "stable" ? [] : inferProductionImpact(after, locationChanged);

  return {
    id: `scene-${sceneNumber}-${status}`,
    status,
    sceneNumber,
    beforeSlugline: before.slugline,
    afterSlugline: after.slugline,
    locationChanged,
    charactersAdded,
    charactersRemoved,
    propsAdded,
    propsRemoved,
    environmentsAdded,
    environmentsRemoved,
    productionImpact,
    riskLevel: status === "stable" ? "low" : inferRisk(productionImpact, after)
  };
}

function splitIntoScenes(text: string) {
  const lines = text.split("\n");
  const scenes: Array<{ slugline: string; body: string }> = [];
  let current: { slugline: string; body: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (isSlugline(trimmed)) {
      if (current) scenes.push({ slugline: current.slugline, body: current.body.join("\n") });
      current = { slugline: trimmed.toUpperCase(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }

  if (current) scenes.push({ slugline: current.slugline, body: current.body.join("\n") });

  if (!scenes.length) {
    return [{ slugline: "INT. UNSPECIFIED LOCATION - DAY", body: text }];
  }

  return scenes;
}

function parseScene(slugline: string, body: string, number: number): ParsedScriptScene {
  const { interiorExterior, location, timeOfDay } = parseSlugline(slugline);
  const actionText = body
    .split("\n")
    .filter((line) => !isCharacterCue(line))
    .join("\n");
  const characters = extractCharacters(body, actionText);
  const props = extractMatches(actionText, propLexicon);
  const stuntBeats = extractBeatLines(actionText, stuntLexicon);
  const vfxBeats = extractBeatLines(actionText, vfxLexicon);
  const environments = uniqueSorted([location, ...extractEnvironmentHints(actionText)]);
  const riskLevel = calculateSceneRisk({ props, stuntBeats, vfxBeats, environments });

  return {
    id: `parsed-scene-${number}`,
    number,
    slugline,
    interiorExterior,
    location,
    timeOfDay,
    text: body.trim(),
    actionText: actionText.trim(),
    characters,
    environments,
    props,
    stuntBeats,
    vfxBeats,
    pageEstimate: Math.max(0.5, Math.round((body.length / 1800) * 10) / 10),
    riskLevel
  };
}

function parseSlugline(slugline: string) {
  const interiorExterior = slugline.match(/^(INT\.\/EXT\.|INT\.|EXT\.)/)?.[0] ?? "UNK.";
  const withoutPrefix = slugline.replace(/^(INT\.\/EXT\.|INT\.|EXT\.)\s*/, "");
  const parts = withoutPrefix.split(" - ");
  const maybeTime = parts[parts.length - 1];
  const timeOfDay = timeTokens.includes(maybeTime) ? maybeTime : "UNSPECIFIED";
  const location = (timeOfDay === "UNSPECIFIED" ? parts.join(" - ") : parts.slice(0, -1).join(" - ")).trim() || "UNSPECIFIED LOCATION";
  return { interiorExterior, location, timeOfDay };
}

function extractCharacters(body: string, actionText: string) {
  const lines = body.split("\n").map((line) => line.trim()).filter(Boolean);
  const cues = lines.filter(isCharacterCue).map(cleanCharacterCue);
  const describedCharacters = extractCharacterDescriptions(actionText);
  return uniqueSorted([...cues, ...describedCharacters]);
}

function extractCharacterDescriptions(text: string) {
  const matches = new Set<string>();
  const articleRolePattern = /\b(?:A|AN|THE)\s+([A-Z][A-Z' -]{2,24}|[A-Za-z]+(?:\s+[A-Za-z]+){0,2})\b/g;
  let match: RegExpExecArray | null;

  while ((match = articleRolePattern.exec(text)) !== null) {
    const candidate = cleanCharacterCue(match[1]);
    const words = candidate.toLowerCase().split(/\s+/);
    if (words.length > 3) continue;
    if (words.some((word) => characterDescriptorLexicon.includes(word))) {
      matches.add(titleCase(candidate));
    }
  }

  return Array.from(matches);
}

function extractMatches(text: string, lexicon: string[]) {
  const lowered = text.toLowerCase();
  return uniqueSorted(lexicon.filter((term) => lowered.includes(term)).map(titleCase));
}

function extractBeatLines(text: string, lexicon: string[]) {
  return text
    .split(/[.\n]/)
    .map((line) => line.trim())
    .filter((line) => line && lexicon.some((term) => line.toLowerCase().includes(term)))
    .slice(0, 8);
}

function extractEnvironmentHints(text: string) {
  return extractMatches(text, ["platform", "tunnel stairs", "train", "carriage", "rooftop", "catwalk", "foundry", "flood channel", "quarry", "safehouse"]);
}

function inferProductionImpact(scene: ParsedScriptScene, locationChanged: boolean) {
  const impact = new Set<string>();
  if (locationChanged) impact.add("Locations clearance and art dressing review");
  if (scene.props.length) impact.add("Props continuity and hero-object tracking");
  if (scene.stuntBeats.length) impact.add("Stunts safety review and blocking update");
  if (scene.vfxBeats.length) impact.add("VFX plate/simulation review");
  if (scene.characters.length > 3) impact.add("Casting/extras and AD scheduling impact");
  if (scene.environments.some((environment) => ["SUBWAY PLATFORM", "SUBWAY TRAIN", "FOUNDRY FLOOR"].includes(environment.toUpperCase()))) {
    impact.add("Previz and storyboard dependency check");
  }
  return Array.from(impact);
}

function inferRisk(impact: string[], scene: ParsedScriptScene): RiskLevel {
  const score = impact.length + scene.stuntBeats.length + scene.vfxBeats.length + (scene.props.length > 3 ? 1 : 0);
  if (score >= 7) return "critical";
  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function calculateSceneRisk(input: { props: string[]; stuntBeats: string[]; vfxBeats: string[]; environments: string[] }): RiskLevel {
  const score = input.props.length + input.stuntBeats.length * 2 + input.vfxBeats.length * 2 + (input.environments.length > 2 ? 1 : 0);
  if (score >= 8) return "critical";
  if (score >= 5) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function isSlugline(line: string) {
  return /^(INT\.|EXT\.|INT\.\/EXT\.)\s+.+/.test(line.toUpperCase());
}

function isCharacterCue(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 32) return false;
  if (isSlugline(trimmed)) return false;
  if (/[:.;!?]/.test(trimmed) || /--|—|–|\.\.\./.test(trimmed)) return false;
  const cleaned = cleanCharacterCue(trimmed);
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (!words.length || words.length > 3) return false;
  if (characterCueStopWords.includes(cleaned) || characterCueStopWords.includes(words[0])) return false;
  if (timeTokens.includes(cleaned)) return false;
  if (/\b(THEM|THERE|HERE|THIS|THAT|THESE|THOSE)\b/.test(cleaned)) return false;
  return /^[A-Z][A-Z0-9 '&-]*?(?:\s+[A-Z0-9 '&-]+){0,2}$/.test(cleaned);
}

function cleanCharacterCue(value: string) {
  return value.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim().replace(/['"-]+$/g, "");
}

function normalizeScriptText(input: string) {
  return input.replace(/\r/g, "").replace(/\u00a0/g, " ").replace(/[ \t]+$/gm, "");
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function difference(next: string[], previous: string[]) {
  return next.filter((item) => !previous.includes(item));
}

function compactText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function titleCase(value: string) {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
