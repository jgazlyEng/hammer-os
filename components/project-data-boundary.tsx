"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileUp, FolderKanban } from "lucide-react";
import { MetricCard, Panel, SectionHeader } from "@/components/ui";
import { getActiveProjectId, getLocalProjects, getProjectScriptVersions, PROJECTS_UPDATED_EVENT, SCRIPT_VERSIONS_UPDATED_EVENT } from "@/lib/project-store";
import type { Project } from "@/lib/types";

export function ProjectDataBoundary({ children, moduleName }: { children: React.ReactNode; moduleName: string }) {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [scriptCount, setScriptCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function sync() {
      const projectId = getActiveProjectId();
      const project = getLocalProjects().find((item) => item.id === projectId) ?? null;
      setActiveProject(project);
      setScriptCount(project ? getProjectScriptVersions(project.id).length : 0);
      setReady(true);
    }

    sync();
    window.addEventListener(PROJECTS_UPDATED_EVENT, sync);
    window.addEventListener(SCRIPT_VERSIONS_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROJECTS_UPDATED_EVENT, sync);
      window.removeEventListener(SCRIPT_VERSIONS_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!ready) {
    return (
      <Panel>
        <p className="font-display text-xs uppercase tracking-[0.18em] text-amberline">Loading Project</p>
      </Panel>
    );
  }

  if (!activeProject || activeProject.id === "hammer") {
    return children;
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.24em] text-amberline">{moduleName}</p>
          <h1 className="mt-3 text-4xl font-semibold text-studio-100 md:text-5xl">{activeProject.title}</h1>
          <p className="mt-3 max-w-3xl text-studio-300">This project has its own local slate record. Production tracking data will appear here as sequences, scenes, approvals, risks, and previz links are added for this film.</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-studio-850 px-4 py-3 font-display text-sm text-studio-300">
          {activeProject.stage} / {activeProject.studioUnit}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Script Version" value={activeProject.currentScriptVersion} sub="Project slate" />
        <MetricCard label="Treatment" value={activeProject.currentTreatmentVersion} sub={`${activeProject.treatmentAlignment}% alignment`} />
        <MetricCard label="Previz" value={`${activeProject.previzCompletion}%`} sub="Project slate" />
        <MetricCard label="Risk" value={activeProject.changeRiskLevel.toUpperCase()} risk={activeProject.changeRiskLevel} />
        <MetricCard label="Uploaded Scripts" value={`${scriptCount}`} sub="Script Intelligence" />
      </div>

      <Panel className="mt-6">
        <SectionHeader eyebrow="Project Data" title={`${moduleName} Is Empty For This Project`} />
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/script-intelligence" className="rounded border border-amberline/25 bg-amberline/10 p-4 transition hover:border-amberline/60">
            <div className="flex items-center gap-3 font-display text-xs uppercase tracking-[0.16em] text-amberline">
              <FileUp className="h-4 w-4" />
              Upload Script
            </div>
            <p className="mt-3 text-sm leading-6 text-studio-100">Parse this project&apos;s script into scenes, characters, environments, props, and production diffs.</p>
          </Link>
          <Link href="/projects" className="rounded border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/25">
            <div className="flex items-center gap-3 font-display text-xs uppercase tracking-[0.16em] text-studio-300">
              <FolderKanban className="h-4 w-4" />
              Manage Slate
            </div>
            <p className="mt-3 text-sm leading-6 text-studio-300">Update this film&apos;s script version, treatment status, production stage, and risk profile.</p>
          </Link>
        </div>
      </Panel>
    </div>
  );
}
