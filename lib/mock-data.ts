import type {
  Approval,
  ChangeRequest,
  Department,
  ImpactReport,
  ParsedScriptVersion,
  PrevizShot,
  Project,
  Risk,
  Scene,
  SceneChange,
  ScriptVersion,
  Sequence,
  Shot,
  TreatmentVersion
} from "@/lib/types";
import { parseScriptText } from "@/lib/script-parser";

export const projects: Project[] = [
  {
    id: "hammer",
    title: "HAMMER",
    codename: "Hammer",
    stage: "Active Development",
    studioUnit: "Action Unit A",
    currentScriptVersion: "S-04 Blue",
    currentTreatmentVersion: "T-03",
    treatmentAlignment: 78,
    previzCompletion: 61,
    changeRiskLevel: "high",
    pendingApprovals: 4
  },
  {
    id: "night-run",
    title: "NIGHT RUN",
    codename: "Night Run",
    stage: "Pre-Production",
    studioUnit: "Thriller Unit",
    currentScriptVersion: "S-02 Pink",
    currentTreatmentVersion: "T-02",
    treatmentAlignment: 86,
    previzCompletion: 34,
    changeRiskLevel: "medium",
    pendingApprovals: 2
  },
  {
    id: "glass-canyon",
    title: "GLASS CANYON",
    codename: "Glass Canyon",
    stage: "Previz Sprint",
    studioUnit: "Adventure Unit",
    currentScriptVersion: "S-05 Yellow",
    currentTreatmentVersion: "T-04",
    treatmentAlignment: 71,
    previzCompletion: 48,
    changeRiskLevel: "high",
    pendingApprovals: 7
  }
];

export const project: Project = projects[0];

export const projectSlateNote =
  "Project switching is local-only in this MVP. HAMMER has the full connected scene, previz, risk, and approval dataset; the additional films establish the slate-level switcher model.";

export const treatmentVersions: TreatmentVersion[] = [
  { id: "t1", version: "T-01", date: "2026-05-03", notes: "Original contained climax at the harbor yard.", alignmentPercent: 54 },
  { id: "t2", version: "T-02", date: "2026-05-17", notes: "Moved Act II chase into public transit corridor.", alignmentPercent: 69 },
  { id: "t3", version: "T-03", date: "2026-05-31", notes: "Current treatment emphasizes subway siege and rooftop extraction.", alignmentPercent: 78 }
];

export const scriptVersions: ScriptVersion[] = [
  {
    id: "s1",
    version: "S-01 White",
    date: "2026-05-05",
    author: "Story Room",
    summary: "Baseline draft from greenlight package.",
    driftNotes: ["Villain motive is procedural rather than personal.", "Final act geography still tracks to treatment T-01."]
  },
  {
    id: "s2",
    version: "S-03 Pink",
    date: "2026-05-23",
    author: "A. Rios",
    summary: "Introduced subway transfer sequence and compressed warehouse pages.",
    driftNotes: ["Hero's second-act choice now happens earlier.", "Two practical stunt beats are no longer motivated by the treatment."]
  },
  {
    id: "s3",
    version: "S-04 Blue",
    date: "2026-06-02",
    author: "A. Rios + Director",
    summary: "Expanded Scene 18 from warehouse exchange to subway ambush.",
    driftNotes: ["Scene 18 changed from warehouse to subway, invalidating prior previz blocking.", "Act III extraction depends on a prop introduced only in script pages."]
  }
];

export const departments: Department[] = [
  { id: "story", name: "Story", lead: "Mina Cho", status: "watch" },
  { id: "previz", name: "Previz", lead: "Dev Patel", status: "at-risk" },
  { id: "vfx", name: "VFX", lead: "Lena Park", status: "watch" },
  { id: "stunts", name: "Stunts", lead: "Ray Okafor", status: "at-risk" },
  { id: "art", name: "Art Dept.", lead: "Celeste Dunn", status: "stable" },
  { id: "locations", name: "Locations", lead: "Owen Webb", status: "blocked" },
  { id: "camera", name: "Camera", lead: "Greta Singh", status: "stable" }
];

export const sequences: Sequence[] = [
  {
    id: "seq-01",
    act: "Act I",
    code: "A1-SQ01",
    title: "Cold Open: Quarry Intercept",
    logline: "The team steals the prototype case before the antagonist reveals the decoy.",
    treatmentStatus: "locked",
    scriptStatus: "stable",
    storyboardStatus: "stable",
    previzStatus: "stable",
    vfxStatus: "stable",
    stuntsStatus: "watch",
    stability: "low",
    completion: 83,
    approvalState: "approved",
    departmentIds: ["story", "previz", "stunts", "camera"]
  },
  {
    id: "seq-02",
    act: "Act I",
    code: "A1-SQ02",
    title: "Safehouse Fracture",
    logline: "A quiet interrogation breaks the crew's trust and sends Mara off-plan.",
    treatmentStatus: "stable",
    scriptStatus: "watch",
    storyboardStatus: "watch",
    previzStatus: "stable",
    vfxStatus: "stable",
    stuntsStatus: "stable",
    stability: "medium",
    completion: 58,
    approvalState: "pending",
    departmentIds: ["story", "art", "camera"]
  },
  {
    id: "seq-03",
    act: "Act II",
    code: "A2-SQ03",
    title: "Warehouse Becomes Subway",
    logline: "The exchange collapses into a moving ambush beneath downtown.",
    treatmentStatus: "watch",
    scriptStatus: "at-risk",
    storyboardStatus: "outdated",
    previzStatus: "outdated",
    vfxStatus: "at-risk",
    stuntsStatus: "blocked",
    stability: "critical",
    completion: 31,
    approvalState: "needs-review",
    departmentIds: ["story", "previz", "vfx", "stunts", "locations", "art"]
  },
  {
    id: "seq-04",
    act: "Act II",
    code: "A2-SQ04",
    title: "Rooftop Relay",
    logline: "Mara crosses between towers while the data key changes hands twice.",
    treatmentStatus: "stable",
    scriptStatus: "stable",
    storyboardStatus: "stable",
    previzStatus: "watch",
    vfxStatus: "watch",
    stuntsStatus: "watch",
    stability: "medium",
    completion: 67,
    approvalState: "pending",
    departmentIds: ["previz", "vfx", "stunts", "camera"]
  },
  {
    id: "seq-05",
    act: "Act III",
    code: "A3-SQ05",
    title: "Foundry Collapse",
    logline: "The hammer rig fails, trapping the antagonist beneath the molten line.",
    treatmentStatus: "stable",
    scriptStatus: "watch",
    storyboardStatus: "watch",
    previzStatus: "watch",
    vfxStatus: "at-risk",
    stuntsStatus: "at-risk",
    stability: "high",
    completion: 44,
    approvalState: "blocked",
    departmentIds: ["previz", "vfx", "stunts", "art"]
  },
  {
    id: "seq-06",
    act: "Act III",
    code: "A3-SQ06",
    title: "Dawn Extraction",
    logline: "The surviving team exits through the flood channel as the city wakes up.",
    treatmentStatus: "stable",
    scriptStatus: "stable",
    storyboardStatus: "stable",
    previzStatus: "stable",
    vfxStatus: "stable",
    stuntsStatus: "stable",
    stability: "low",
    completion: 76,
    approvalState: "approved",
    departmentIds: ["story", "previz", "camera", "locations"]
  }
];

export const scenes: Scene[] = [
  { id: "sc-07", sequenceId: "seq-01", number: "7", slugline: "EXT. QUARRY ROAD - NIGHT", summary: "Armored convoy reroutes into the quarry trap.", scriptVersion: "S-04 Blue", status: "stable", departmentIds: ["stunts", "camera"] },
  { id: "sc-12", sequenceId: "seq-02", number: "12", slugline: "INT. SAFEHOUSE - DAWN", summary: "Mara catches Holt hiding a second tracker.", scriptVersion: "S-04 Blue", status: "watch", creativeDriftNote: "Dialogue now makes Holt complicit earlier than T-03.", departmentIds: ["story", "art"] },
  { id: "sc-18", sequenceId: "seq-03", number: "18", slugline: "INT. SUBWAY PLATFORM - NIGHT", summary: "The exchange relocates from a warehouse to a crowded platform as trains cycle through.", scriptVersion: "S-04 Blue", status: "at-risk", changedFrom: "INT. WAREHOUSE LOADING BAY - NIGHT", creativeDriftNote: "Scene 18 changed from warehouse to subway, shifting geography, extras, stunts, and plate needs.", departmentIds: ["story", "previz", "vfx", "stunts", "locations", "art"] },
  { id: "sc-19", sequenceId: "seq-03", number: "19", slugline: "INT. SUBWAY TRAIN - CONTINUOUS", summary: "Mara fights through the train while Holt loses the prototype case.", scriptVersion: "S-04 Blue", status: "blocked", departmentIds: ["previz", "stunts", "vfx"] },
  { id: "sc-28", sequenceId: "seq-04", number: "28", slugline: "EXT. ROOFTOP - NIGHT", summary: "The data key crosses from drone to zipline rig.", scriptVersion: "S-04 Blue", status: "watch", departmentIds: ["previz", "vfx", "stunts"] },
  { id: "sc-41", sequenceId: "seq-05", number: "41", slugline: "INT. FOUNDRY FLOOR - NIGHT", summary: "A magnetic hammer rig collapses the catwalk.", scriptVersion: "S-04 Blue", status: "at-risk", departmentIds: ["vfx", "stunts", "art"] },
  { id: "sc-52", sequenceId: "seq-06", number: "52", slugline: "EXT. FLOOD CHANNEL - DAWN", summary: "Mara burns the tracker and walks away from the case.", scriptVersion: "S-04 Blue", status: "stable", departmentIds: ["camera", "locations"] }
];

export const shots: Shot[] = [
  { id: "shot-18a", sceneId: "sc-18", code: "18A", description: "Wide reveal of the platform crowd parting around the case handoff.", storyboardPanel: "SB-18-011", status: "outdated" },
  { id: "shot-18b", sceneId: "sc-18", code: "18B", description: "Train arrival masks stunt team entry from tunnel stairs.", storyboardPanel: "SB-18-014", status: "outdated" },
  { id: "shot-18c", sceneId: "sc-18", code: "18C", description: "Overhead security cam angle tracks case drop to third rail edge.", storyboardPanel: "SB-18-018", status: "watch" },
  { id: "shot-19a", sceneId: "sc-19", code: "19A", description: "One-take aisle fight from carriage two to four.", storyboardPanel: "SB-19-006", status: "blocked" },
  { id: "shot-28a", sceneId: "sc-28", code: "28A", description: "Drone passes data key below billboard catwalk.", storyboardPanel: "SB-28-009", status: "watch" },
  { id: "shot-41a", sceneId: "sc-41", code: "41A", description: "Hammer rig tears loose from gantry.", storyboardPanel: "SB-41-015", status: "at-risk" }
];

export const previzShots: PrevizShot[] = [
  { id: "pv-18a", shotId: "shot-18a", code: "PV-18A-v03", version: "v03", status: "outdated", outdatedReason: "Built for warehouse loading bay geography.", owner: "N. Shah" },
  { id: "pv-18b", shotId: "shot-18b", code: "PV-18B-v02", version: "v02", status: "outdated", outdatedReason: "Train timing and crowd lanes missing from animatic.", owner: "N. Shah" },
  { id: "pv-18c", shotId: "shot-18c", code: "PV-18C-v01", version: "v01", status: "watch", outdatedReason: "Camera logic survives, but new plate requirements pending.", owner: "I. Mercer" },
  { id: "pv-19a", shotId: "shot-19a", code: "PV-19A-v01", version: "v01", status: "blocked", outdatedReason: "Awaiting stunt-safe aisle layout.", owner: "D. Patel" },
  { id: "pv-28a", shotId: "shot-28a", code: "PV-28A-v04", version: "v04", status: "watch", owner: "I. Mercer" },
  { id: "pv-41a", shotId: "shot-41a", code: "PV-41A-v02", version: "v02", status: "at-risk", outdatedReason: "VFX sim scale changed after hammer mass revision.", owner: "N. Shah" }
];

export const approvals: Approval[] = [
  { id: "ap-1", sequenceId: "seq-03", departmentId: "locations", state: "blocked", owner: "Owen Webb", due: "2026-06-04" },
  { id: "ap-2", sequenceId: "seq-03", departmentId: "stunts", state: "needs-review", owner: "Ray Okafor", due: "2026-06-03" },
  { id: "ap-3", sequenceId: "seq-04", departmentId: "vfx", state: "pending", owner: "Lena Park", due: "2026-06-05" },
  { id: "ap-4", sequenceId: "seq-05", departmentId: "art", state: "blocked", owner: "Celeste Dunn", due: "2026-06-06" },
  { id: "ap-5", sequenceId: "seq-06", departmentId: "camera", state: "approved", owner: "Greta Singh", due: "2026-06-02" }
];

export const risks: Risk[] = [
  { id: "risk-1", sequenceId: "seq-03", title: "Subway location not cleared", detail: "Storyboard and previz cannot lock until platform geometry is approved.", level: "critical", owner: "Locations" },
  { id: "risk-2", sequenceId: "seq-03", title: "Fight beats exceed safe aisle width", detail: "Stunts needs a revised layout before 19A can continue.", level: "high", owner: "Stunts" },
  { id: "risk-3", sequenceId: "seq-05", title: "Hammer rig scale change", detail: "VFX simulation and art build are now using different mass assumptions.", level: "high", owner: "VFX" },
  { id: "risk-4", sequenceId: "seq-04", title: "Drone handoff plate timing", detail: "Previz is missing final skyline plate frame rate.", level: "medium", owner: "Previz" },
  { id: "risk-5", sequenceId: "seq-02", title: "Motivation drift", detail: "Scene 12 reveals Holt's betrayal earlier than the treatment supports.", level: "medium", owner: "Story" }
];

export const changeRequests: ChangeRequest[] = [
  { id: "cr-1", submittedBy: "Director", sequenceId: "seq-03", sceneId: "sc-18", description: "Move exchange from warehouse to subway platform.", reason: "Public pressure raises stakes and makes the betrayal visible.", priority: "urgent", submittedAt: "2026-06-02 18:40", riskLevel: "critical" },
  { id: "cr-2", submittedBy: "Producer", sequenceId: "seq-05", sceneId: "sc-41", description: "Increase foundry collapse by thirty seconds.", reason: "Trailer beat needs a clearer hammer silhouette.", priority: "high", submittedAt: "2026-06-03 09:15", riskLevel: "high" }
];

export const sceneChanges: SceneChange[] = [
  { id: "chg-18", fromVersion: "S-03 Pink", toVersion: "S-04 Blue", sceneId: "sc-18", before: "INT. WAREHOUSE LOADING BAY - NIGHT", after: "INT. SUBWAY PLATFORM - NIGHT", impact: "Invalidates warehouse previs, requires platform location, extras, train timing, VFX plates, and new stunt lanes.", driftNote: "The treatment still names a private exchange; current script turns it into a public ambush.", riskLevel: "critical" },
  { id: "chg-12", fromVersion: "S-03 Pink", toVersion: "S-04 Blue", sceneId: "sc-12", before: "Holt denies knowing the route.", after: "Holt hides a second tracker under the table.", impact: "Shifts character trust earlier; story and performance approval needed.", driftNote: "Motivation is clearer but compresses Act I suspicion.", riskLevel: "medium" },
  { id: "chg-41", fromVersion: "S-03 Pink", toVersion: "S-04 Blue", sceneId: "sc-41", before: "Catwalk sparks and fails off-screen.", after: "Hammer rig breaks loose on-screen.", impact: "Adds VFX simulation, art department rig detail, and stunt safety review.", driftNote: "Raises spectacle while increasing physical logic burden.", riskLevel: "high" }
];

const hammerPreviousDraftText = `TITLE: HAMMER

EXT. QUARRY ROAD - NIGHT

An armored convoy crawls through rain. MARA watches from the ridge as HOLT checks the prototype case.

MARA
We take the case, not the truck.

The lead vehicle crashes into a quarry barricade.

INT. SAFEHOUSE - DAWN

MARA questions HOLT at the metal table.

HOLT
You are reading this wrong.

INT. WAREHOUSE LOADING BAY - NIGHT

The prototype case changes hands beside stacked pallets. HOLT spots a security guard by the loading doors.

MARA
Holt, do not move.

A short fight breaks near the truck ramp.

EXT. ROOFTOP - NIGHT

A drone drops the data key toward a zipline rig. MARA jumps across the billboard catwalk.

INT. FOUNDRY FLOOR - NIGHT

The hammer rig sparks above the catwalk.

EXT. FLOOD CHANNEL - DAWN

MARA burns the tracker and leaves the prototype case behind.`;

export const parsedScriptBaselines: ParsedScriptVersion[] = [
  parseScriptText(hammerPreviousDraftText, {
    projectId: "hammer",
    versionName: "S-03 Pink",
    fileName: "hammer-s03-pink.txt"
  })
];

export function getDepartmentName(id: string) {
  return departments.find((department) => department.id === id)?.name ?? id;
}

export function buildImpactReport(sequenceId: string, sceneId: string, priority: string): ImpactReport {
  const scene = scenes.find((item) => item.id === sceneId);
  const linkedShots = shots.filter((shot) => shot.sceneId === sceneId);
  const linkedPreviz = previzShots.filter((previz) => linkedShots.some((shot) => shot.id === previz.shotId));
  const departmentNames = (scene?.departmentIds ?? sequences.find((item) => item.id === sequenceId)?.departmentIds ?? []).map(getDepartmentName);
  const urgencyMultiplier = priority === "urgent" ? 1.35 : priority === "high" ? 1.15 : 1;
  const estimatedHours = Math.round((18 + linkedShots.length * 9 + departmentNames.length * 5) * urgencyMultiplier);

  return {
    affectedScriptReferences: scene ? [`Scene ${scene.number}`, scene.slugline, scene.scriptVersion] : ["Unassigned scene"],
    affectedStoryboardPanels: linkedShots.map((shot) => shot.storyboardPanel),
    affectedPrevizShots: linkedPreviz.map((previz) => previz.code),
    affectedDepartments: departmentNames,
    estimatedHours,
    riskLevel: priority === "urgent" || linkedPreviz.some((previz) => previz.status === "outdated" || previz.status === "blocked") ? "critical" : priority === "high" ? "high" : "medium",
    budgetImpact: estimatedHours > 75 ? "$180k-$260k exposure" : estimatedHours > 45 ? "$90k-$160k exposure" : "$35k-$80k exposure",
    scheduleImpact: estimatedHours > 75 ? "Likely 4-6 day previz ripple" : estimatedHours > 45 ? "Likely 2-3 day department ripple" : "Likely same-week update"
  };
}
