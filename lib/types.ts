export type Status = "locked" | "stable" | "watch" | "at-risk" | "blocked" | "outdated";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type ApprovalState = "approved" | "pending" | "needs-review" | "blocked";
export type Priority = "low" | "medium" | "high" | "urgent";

export interface Project {
  id: string;
  title: string;
  codename?: string;
  stage?: string;
  studioUnit?: string;
  currentScriptVersion: string;
  currentTreatmentVersion: string;
  treatmentAlignment: number;
  previzCompletion: number;
  changeRiskLevel: RiskLevel;
  pendingApprovals?: number;
}

export interface TreatmentVersion {
  id: string;
  version: string;
  date: string;
  notes: string;
  alignmentPercent: number;
}

export interface ScriptVersion {
  id: string;
  version: string;
  date: string;
  author: string;
  summary: string;
  driftNotes: string[];
}

export interface Department {
  id: string;
  name: string;
  lead: string;
  status: Status;
}

export interface Sequence {
  id: string;
  act: "Act I" | "Act II" | "Act III";
  code: string;
  title: string;
  logline: string;
  treatmentStatus: Status;
  scriptStatus: Status;
  storyboardStatus: Status;
  previzStatus: Status;
  vfxStatus: Status;
  stuntsStatus: Status;
  stability: RiskLevel;
  completion: number;
  approvalState: ApprovalState;
  departmentIds: string[];
}

export interface Scene {
  id: string;
  sequenceId: string;
  number: string;
  slugline: string;
  summary: string;
  scriptVersion: string;
  status: Status;
  changedFrom?: string;
  creativeDriftNote?: string;
  departmentIds: string[];
}

export interface Shot {
  id: string;
  sceneId: string;
  code: string;
  description: string;
  storyboardPanel: string;
  status: Status;
}

export interface PrevizShot {
  id: string;
  shotId: string;
  code: string;
  version: string;
  status: Status;
  outdatedReason?: string;
  owner: string;
}

export interface ChangeRequest {
  id: string;
  submittedBy: string;
  sequenceId: string;
  sceneId: string;
  description: string;
  reason: string;
  priority: Priority;
  submittedAt: string;
  riskLevel: RiskLevel;
}

export interface Approval {
  id: string;
  sequenceId: string;
  departmentId: string;
  state: ApprovalState;
  owner: string;
  due: string;
}

export interface Risk {
  id: string;
  sequenceId: string;
  title: string;
  detail: string;
  level: RiskLevel;
  owner: string;
}

export interface SceneChange {
  id: string;
  fromVersion: string;
  toVersion: string;
  sceneId: string;
  before: string;
  after: string;
  impact: string;
  driftNote: string;
  riskLevel: RiskLevel;
}

export interface ImpactReport {
  affectedScriptReferences: string[];
  affectedStoryboardPanels: string[];
  affectedPrevizShots: string[];
  affectedDepartments: string[];
  estimatedHours: number;
  riskLevel: RiskLevel;
  budgetImpact: string;
  scheduleImpact: string;
}

export type ScriptElementType = "character" | "environment" | "prop" | "stunt" | "vfx";

export interface ParsedScriptScene {
  id: string;
  number: number;
  slugline: string;
  interiorExterior: string;
  location: string;
  timeOfDay: string;
  text: string;
  actionText: string;
  characters: string[];
  environments: string[];
  props: string[];
  stuntBeats: string[];
  vfxBeats: string[];
  pageEstimate: number;
  riskLevel: RiskLevel;
}

export interface ParsedScriptVersion {
  id: string;
  projectId: string;
  versionName: string;
  fileName: string;
  uploadedAt: string;
  scenes: ParsedScriptScene[];
  characters: string[];
  environments: string[];
  props: string[];
  stuntBeats: string[];
  vfxBeats: string[];
}

export interface SceneProductionDiff {
  id: string;
  status: "added" | "removed" | "changed" | "stable";
  sceneNumber: number;
  beforeSlugline?: string;
  afterSlugline?: string;
  locationChanged: boolean;
  charactersAdded: string[];
  charactersRemoved: string[];
  propsAdded: string[];
  propsRemoved: string[];
  environmentsAdded: string[];
  environmentsRemoved: string[];
  productionImpact: string[];
  riskLevel: RiskLevel;
}

export interface ScriptProductionDiff {
  fromVersion: string;
  toVersion: string;
  scenesAdded: number;
  scenesRemoved: number;
  scenesChanged: number;
  locationsChanged: number;
  charactersAdded: string[];
  propsAdded: string[];
  highRiskChanges: number;
  diffs: SceneProductionDiff[];
}
