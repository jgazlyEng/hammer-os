import { projects as seededProjects } from "@/lib/mock-data";
import type { ParsedScriptVersion, Project, RiskLevel } from "@/lib/types";

export const ACTIVE_PROJECT_STORAGE_KEY = "hammer-active-project";
export const PROJECTS_STORAGE_KEY = "hammer-projects";
export const PROJECTS_UPDATED_EVENT = "hammer-projects-updated";
export const SCRIPT_VERSIONS_UPDATED_EVENT = "hammer-script-versions-updated";

export interface ProjectDraft {
  title: string;
  stage: string;
  studioUnit: string;
  currentScriptVersion: string;
  currentTreatmentVersion: string;
  treatmentAlignment: number;
  previzCompletion: number;
  changeRiskLevel: RiskLevel;
}

export function getLocalProjects() {
  if (typeof window === "undefined") return seededProjects;
  const storage = getStorage();
  if (!storage) return seededProjects;

  const stored = storage.getItem(PROJECTS_STORAGE_KEY);
  if (!stored) {
    saveLocalProjects(seededProjects);
    return seededProjects;
  }

  try {
    return normalizeProjects(JSON.parse(stored));
  } catch {
    saveLocalProjects(seededProjects);
    return seededProjects;
  }
}

export function saveLocalProjects(projects: Project[]) {
  if (typeof window === "undefined") return;
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(normalizeProjects(projects)));
  window.dispatchEvent(new Event(PROJECTS_UPDATED_EVENT));
}

export function getActiveProjectId() {
  if (typeof window === "undefined") return seededProjects[0].id;
  const storage = getStorage();
  return storage?.getItem(ACTIVE_PROJECT_STORAGE_KEY) ?? seededProjects[0].id;
}

export function saveActiveProjectId(projectId: string) {
  if (typeof window === "undefined") return;
  const storage = getStorage();
  if (storage) {
    storage.setItem(ACTIVE_PROJECT_STORAGE_KEY, projectId);
  }
  window.dispatchEvent(new Event(PROJECTS_UPDATED_EVENT));
}

export function getProjectScriptVersions(projectId: string) {
  if (typeof window === "undefined") return [];
  const storage = getStorage();
  if (!storage) return [];

  const stored = storage.getItem(scriptVersionsKey(projectId));
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isParsedScriptVersionLike) : [];
  } catch {
    return [];
  }
}

export function saveProjectScriptVersions(projectId: string, versions: ParsedScriptVersion[]) {
  if (typeof window === "undefined") return;
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(scriptVersionsKey(projectId), JSON.stringify(versions));
  window.dispatchEvent(new Event(SCRIPT_VERSIONS_UPDATED_EVENT));
}

export function createProjectFromDraft(draft: ProjectDraft): Project {
  return {
    id: uniqueProjectId(draft.title),
    title: draft.title.trim().toUpperCase(),
    codename: draft.title.trim(),
    stage: draft.stage.trim() || "Development",
    studioUnit: draft.studioUnit.trim() || "Unassigned Unit",
    currentScriptVersion: draft.currentScriptVersion.trim() || "S-01 White",
    currentTreatmentVersion: draft.currentTreatmentVersion.trim() || "T-01",
    treatmentAlignment: clampPercent(draft.treatmentAlignment),
    previzCompletion: clampPercent(draft.previzCompletion),
    changeRiskLevel: draft.changeRiskLevel,
    pendingApprovals: 0
  };
}

export function canDeleteProject(project: Project, projects: Project[]) {
  return project.id !== "hammer" && projects.length > 1;
}

function normalizeProjects(input: unknown): Project[] {
  if (!Array.isArray(input)) return seededProjects;

  const byId = new Map<string, Project>();
  for (const project of seededProjects) {
    byId.set(project.id, project);
  }

  for (const item of input) {
    if (!isProjectLike(item)) continue;
    byId.set(item.id, {
      ...item,
      title: item.title.trim().toUpperCase(),
      currentScriptVersion: item.currentScriptVersion || "S-01 White",
      currentTreatmentVersion: item.currentTreatmentVersion || "T-01",
      treatmentAlignment: clampPercent(item.treatmentAlignment),
      previzCompletion: clampPercent(item.previzCompletion),
      changeRiskLevel: item.changeRiskLevel || "medium"
    });
  }

  return Array.from(byId.values());
}

function isProjectLike(value: unknown): value is Project {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<Project>;
  return Boolean(project.id && project.title);
}

function uniqueProjectId(title: string) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "project";
  return `${base}-${Date.now().toString(36)}`;
}

function clampPercent(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function scriptVersionsKey(projectId: string) {
  return `hammer-script-versions:${projectId}`;
}

function isParsedScriptVersionLike(value: unknown): value is ParsedScriptVersion {
  if (!value || typeof value !== "object") return false;
  const script = value as Partial<ParsedScriptVersion>;
  return Boolean(script.id && script.projectId && script.versionName && script.fileName && Array.isArray(script.scenes));
}

function getStorage() {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}
