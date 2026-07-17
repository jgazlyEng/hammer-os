"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Panel, RiskBadge, SectionHeader } from "@/components/ui";
import {
  canDeleteProject,
  createProjectFromDraft,
  getActiveProjectId,
  getLocalProjects,
  type ProjectDraft,
  PROJECTS_UPDATED_EVENT,
  saveActiveProjectId,
  saveLocalProjects
} from "@/lib/project-store";
import type { Project, RiskLevel } from "@/lib/types";

const emptyDraft: ProjectDraft = {
  title: "",
  stage: "Development",
  studioUnit: "Unassigned Unit",
  currentScriptVersion: "S-01 White",
  currentTreatmentVersion: "T-01",
  treatmentAlignment: 0,
  previzCompletion: 0,
  changeRiskLevel: "medium"
};

export function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("hammer");
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft);
  const [message, setMessage] = useState("Development Slate syncs to the database when DATABASE_URL is configured.");

  useEffect(() => {
    function sync() {
      setProjects(getLocalProjects());
      setActiveProjectId(getActiveProjectId());
    }

    sync();
    hydrateFromApi();
    window.addEventListener(PROJECTS_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROJECTS_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const activeProject = useMemo(() => projects.find((project) => project.id === activeProjectId) ?? projects[0], [activeProjectId, projects]);

  async function hydrateFromApi() {
    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data.projects)) {
        saveLocalProjects(data.projects);
        setProjects(data.projects);
      }
    } catch {
      setMessage("Database not reachable; using local project cache.");
    }
  }

  async function createProjectSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) {
      setMessage("Project title is required.");
      return;
    }

    const project = await createProjectWithFallback(draft);
    const nextProjects = [...projects, project];
    saveLocalProjects(nextProjects);
    saveActiveProjectId(project.id);
    setProjects(nextProjects);
    setActiveProjectId(project.id);
    setDraft(emptyDraft);
    setMessage(`${project.title} created and selected.`);
  }

  async function deleteProject(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project || !canDeleteProject(project, projects)) {
      setMessage("HAMMER is the protected seed project in this local MVP.");
      return;
    }

    await deleteProjectFromApi(projectId);
    const nextProjects = projects.filter((item) => item.id !== projectId);
    const nextActiveProjectId = activeProjectId === projectId ? nextProjects[0]?.id ?? "hammer" : activeProjectId;
    saveLocalProjects(nextProjects);
    saveActiveProjectId(nextActiveProjectId);
    setProjects(nextProjects);
    setActiveProjectId(nextActiveProjectId);
    setMessage(`${project.title} deleted.`);
  }

  function selectProject(projectId: string) {
    saveActiveProjectId(projectId);
    setActiveProjectId(projectId);
    setMessage(`${projects.find((project) => project.id === projectId)?.title ?? "Project"} selected.`);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.24em] text-amberline">Development Slate</p>
          <h1 className="mt-2 text-3xl font-semibold text-studio-100 md:text-4xl">Create and Manage Slate Items</h1>
          <p className="mt-3 max-w-3xl text-studio-300">Add films to the development slate, switch the active slate item, and remove custom items when they leave the board.</p>
        </div>
        {activeProject ? (
          <div className="rounded-lg border border-white/10 bg-studio-850 px-4 py-3 font-display text-sm text-studio-300">
            Active <span className="text-studio-100">{activeProject.title}</span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <SectionHeader eyebrow="New Project" title="Add Film" />
          <form onSubmit={createProjectSubmit} className="space-y-4">
            <Field label="Project Title">
              <input className="field" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Example: Black Meridian" />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Stage">
                <input className="field" value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value })} />
              </Field>
              <Field label="Studio Unit">
                <input className="field" value={draft.studioUnit} onChange={(event) => setDraft({ ...draft, studioUnit: event.target.value })} />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Script Version">
                <input className="field" value={draft.currentScriptVersion} onChange={(event) => setDraft({ ...draft, currentScriptVersion: event.target.value })} />
              </Field>
              <Field label="Treatment Version">
                <input className="field" value={draft.currentTreatmentVersion} onChange={(event) => setDraft({ ...draft, currentTreatmentVersion: event.target.value })} />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Treatment Alignment">
                <input className="field" type="number" min="0" max="100" value={draft.treatmentAlignment} onChange={(event) => setDraft({ ...draft, treatmentAlignment: Number(event.target.value) })} />
              </Field>
              <Field label="Previz Completion">
                <input className="field" type="number" min="0" max="100" value={draft.previzCompletion} onChange={(event) => setDraft({ ...draft, previzCompletion: Number(event.target.value) })} />
              </Field>
            </div>
            <Field label="Change Risk">
              <select className="field" value={draft.changeRiskLevel} onChange={(event) => setDraft({ ...draft, changeRiskLevel: event.target.value as RiskLevel })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </Field>
            <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-amberline px-4 py-3 font-semibold text-studio-950 transition hover:bg-[#f1c974]">
              <Plus className="h-4 w-4" />
              Create Slate Item
            </button>
            <p className="text-sm text-studio-300">{message}</p>
          </form>
        </Panel>

        <Panel>
          <SectionHeader eyebrow="Slate" title="Development Slate" />
          <div className="grid gap-3">
            {projects.map((project) => {
              const active = project.id === activeProjectId;
              const deletable = canDeleteProject(project, projects);
              return (
                <div key={project.id} className={`rounded-lg border p-4 transition ${active ? "border-amberline/50 bg-amberline/10" : "border-white/10 bg-white/[0.03]"}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-studio-100">{project.title}</h3>
                        <RiskBadge level={project.changeRiskLevel} />
                        {active ? <span className="rounded border border-signal/35 bg-signal/10 px-2 py-1 font-display text-[11px] uppercase text-signal">active</span> : null}
                        {project.id === "hammer" ? <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-display text-[11px] uppercase text-studio-300">seed</span> : null}
                      </div>
                      <p className="mt-2 text-sm text-studio-300">{project.stage} / {project.studioUnit}</p>
                      <div className="mt-4 grid gap-2 md:grid-cols-4">
                        <SlateStat label="Script" value={project.currentScriptVersion} />
                        <SlateStat label="Treatment" value={project.currentTreatmentVersion} />
                        <SlateStat label="Alignment" value={`${project.treatmentAlignment}%`} />
                        <SlateStat label="Previz" value={`${project.previzCompletion}%`} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => selectProject(project.id)}
                        className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-studio-100 transition hover:border-amberline/35"
                      >
                        Select
                      </button>
                      <button
                        type="button"
                        disabled={!deletable}
                        onClick={() => deleteProject(project.id)}
                        className="inline-flex items-center gap-2 rounded-md border border-ember/30 bg-ember/10 px-3 py-2 text-sm font-semibold text-ember transition hover:border-ember/60 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.02] disabled:text-studio-500"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-display text-xs uppercase tracking-[0.16em] text-studio-300">{label}</span>
      {children}
    </label>
  );
}

function SlateStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-studio-950/40 px-3 py-2">
      <p className="font-display text-[10px] uppercase text-studio-300">{label}</p>
      <p className="mt-1 text-sm font-semibold text-studio-100">{value}</p>
    </div>
  );
}

async function createProjectWithFallback(draft: ProjectDraft) {
  try {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });
    if (response.ok) {
      const data = await response.json();
      if (data.project) return data.project as Project;
    }
  } catch {
    // Local fallback keeps the prototype usable without MySQL running.
  }

  return createProjectFromDraft(draft);
}

async function deleteProjectFromApi(projectId: string) {
  try {
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
  } catch {
    // Local fallback deletion still proceeds when the DB is unavailable.
  }
}
