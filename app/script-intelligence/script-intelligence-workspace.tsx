"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileScan, Loader2, UploadCloud } from "lucide-react";
import { EmptyState, Panel, RiskBadge, SectionHeader, StatusBadge } from "@/components/ui";
import { parsedScriptBaselines } from "@/lib/mock-data";
import { extractPdfText } from "@/lib/pdf-parser";
import {
  getActiveProjectId,
  getLocalProjects,
  getProjectScriptVersions,
  PROJECTS_UPDATED_EVENT,
  saveProjectScriptVersions,
  SCRIPT_VERSIONS_UPDATED_EVENT
} from "@/lib/project-store";
import { buildScriptDiff, parseFdxText, parseScriptText, sampleScriptText } from "@/lib/script-parser";
import type { ParsedScriptScene, ParsedScriptVersion, ScriptProductionDiff } from "@/lib/types";

type EntityTab = "characters" | "environments" | "props" | "stunts" | "vfx";
type WorkspaceTab = "scenes" | "inspector" | "elements" | "diff";

export function ScriptIntelligenceWorkspace() {
  const [activeProjectId, setActiveProjectId] = useState("hammer");
  const [activeProjectTitle, setActiveProjectTitle] = useState("HAMMER");
  const [scriptVersions, setScriptVersions] = useState<ParsedScriptVersion[]>([]);
  const [versionName, setVersionName] = useState("S-05 Yellow");
  const [uploadedBy, setUploadedBy] = useState("Story Dept.");
  const [currentScript, setCurrentScript] = useState<ParsedScriptVersion | null>(null);
  const [previousId, setPreviousId] = useState(parsedScriptBaselines[0]?.id ?? "");
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [entityTab, setEntityTab] = useState<EntityTab>("characters");
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("scenes");
  const [parseMessage, setParseMessage] = useState("Upload a script to begin parsing this project.");
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    function syncActiveProject() {
      const projectId = getActiveProjectId();
      const project = getLocalProjects().find((item) => item.id === projectId);
      const storedVersions = getProjectScriptVersions(projectId);
      const fallbackVersions = projectId === "hammer" ? getHammerDefaultVersions() : [];
      const nextVersions = storedVersions.length ? storedVersions : fallbackVersions;
      const latest = nextVersions[nextVersions.length - 1] ?? null;

      setActiveProjectId(projectId);
      setActiveProjectTitle(project?.title ?? projectId.toUpperCase());
      setScriptVersions(nextVersions);
      setCurrentScript(latest);
      setSelectedSceneId(latest?.scenes[0]?.id ?? null);
      setPreviousId(getDefaultPreviousId(projectId, nextVersions, latest));
      setParseMessage(latest ? `Loaded ${latest.versionName} for ${project?.title ?? projectId}.` : `No script uploaded yet for ${project?.title ?? projectId}.`);
    }

    syncActiveProject();
    window.addEventListener(PROJECTS_UPDATED_EVENT, syncActiveProject);
    window.addEventListener(SCRIPT_VERSIONS_UPDATED_EVENT, syncActiveProject);
    window.addEventListener("storage", syncActiveProject);
    return () => {
      window.removeEventListener(PROJECTS_UPDATED_EVENT, syncActiveProject);
      window.removeEventListener(SCRIPT_VERSIONS_UPDATED_EVENT, syncActiveProject);
      window.removeEventListener("storage", syncActiveProject);
    };
  }, []);

  const compareOptions = useMemo(() => getCompareOptions(activeProjectId, scriptVersions, currentScript), [activeProjectId, scriptVersions, currentScript]);
  const previousScript = compareOptions.find((script) => script.id === previousId) ?? compareOptions[0] ?? null;
  const diff = useMemo(() => (previousScript && currentScript ? buildScriptDiff(previousScript, currentScript) : null), [previousScript, currentScript]);
  const selectedScene = currentScript?.scenes.find((scene) => scene.id === selectedSceneId) ?? currentScript?.scenes[0] ?? null;
  const entityRows = currentScript ? getEntityRows(currentScript, entityTab) : [];

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setIsParsing(true);
    setParseMessage("Parsing draft locally...");

    try {
      setParseMessage("Uploading script to shared project database...");
      const apiResult = await uploadScriptToApi({
        projectId: activeProjectId,
        versionName,
        uploadedBy,
        file
      });
      if (apiResult?.ocrRequired) {
        setParseMessage(`${file.name} was uploaded and marked OCR required. ${apiResult.message ?? "Scanned PDFs need OCR before scene parsing."}`);
        return;
      }

      if (apiResult?.parsed) {
        const apiParsed = apiResult.parsed;
        const nextVersions = upsertScriptVersion(scriptVersions, apiParsed);
        saveProjectScriptVersions(activeProjectId, nextVersions);
        setScriptVersions(nextVersions);
        setCurrentScript(apiParsed);
        setSelectedSceneId(apiParsed.scenes[0]?.id ?? null);
        setPreviousId(getDefaultPreviousId(activeProjectId, nextVersions, apiParsed));
        setParseMessage(`Parsed ${apiParsed.scenes.length} scenes from ${file.name}. Uploaded by ${uploadedBy}.`);
        return;
      }

      const isFdx = file.name.toLowerCase().endsWith(".fdx");
      const isPdf = file.name.toLowerCase().endsWith(".pdf");
      setParseMessage(isPdf ? "Extracting text from PDF..." : "Reading script file...");
      const text = isPdf ? await extractPdfText(file) : await file.text();
      if (!text.trim()) {
        throw new Error("No text found in uploaded file.");
      }
      setParseMessage("Breaking script into scenes and production elements...");
      const parsed = isFdx
        ? parseFdxText(text, { projectId: activeProjectId, versionName, fileName: file.name })
        : parseScriptText(text, { projectId: activeProjectId, versionName, fileName: file.name });

      const nextVersions = upsertScriptVersion(scriptVersions, parsed);
      saveProjectScriptVersions(activeProjectId, nextVersions);
      setScriptVersions(nextVersions);
      setCurrentScript(parsed);
      setSelectedSceneId(parsed.scenes[0]?.id ?? null);
      setPreviousId(getDefaultPreviousId(activeProjectId, nextVersions, parsed));
      setParseMessage(`Parsed ${parsed.scenes.length} scenes from ${file.name}. Uploaded by ${uploadedBy}.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown parser error.";
      setParseMessage(`Could not parse ${file.name}. ${detail} Scanned PDFs need OCR; exported screenplay PDFs should work.`);
    } finally {
      setIsParsing(false);
    }
  }

  function loadSample() {
    const parsed = parseScriptText(sampleScriptText, { projectId: activeProjectId, versionName, fileName: `sample-${activeProjectId}.txt` });
    const nextVersions = upsertScriptVersion(scriptVersions, parsed);
    saveProjectScriptVersions(activeProjectId, nextVersions);
    setScriptVersions(nextVersions);
    setCurrentScript(parsed);
    setSelectedSceneId(parsed.scenes[0]?.id ?? null);
    setPreviousId(getDefaultPreviousId(activeProjectId, nextVersions, parsed));
    setParseMessage(`Sample draft loaded for ${activeProjectTitle}.`);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.24em] text-amberline">Script Intelligence</p>
          <h1 className="mt-2 text-3xl font-semibold text-studio-100 md:text-4xl">Upload, Parse, Compare</h1>
          <p className="mt-3 max-w-3xl text-studio-300">Break drafts into scenes, characters, environments, props, stunt beats, VFX beats, and production-impact diffs.</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-studio-850 px-4 py-3 font-display text-sm text-studio-300">
          Project <span className="text-studio-100">{activeProjectTitle}</span>
          {currentScript ? <> / Draft <span className="text-studio-100">{currentScript.versionName}</span></> : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel>
          <SectionHeader eyebrow="Intake" title="Upload Script Version" />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block font-display text-xs uppercase tracking-[0.16em] text-studio-300">Version Name</span>
              <input className="field" value={versionName} onChange={(event) => setVersionName(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-2 block font-display text-xs uppercase tracking-[0.16em] text-studio-300">Uploaded By</span>
              <input className="field" value={uploadedBy} onChange={(event) => setUploadedBy(event.target.value)} />
            </label>
          </div>
          <label className="mt-4 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-amberline/35 bg-amberline/10 p-6 text-center transition hover:border-amberline/70">
            {isParsing ? <Loader2 className="h-8 w-8 animate-spin text-amberline" /> : <UploadCloud className="h-8 w-8 text-amberline" />}
            <span className="mt-3 font-semibold text-studio-100">Drop or select a screenplay file</span>
            <span className="mt-2 max-w-md text-sm text-studio-300">FDX preferred. PDF and TXT screenplay exports parse locally. DOCX will need server extraction for production-grade accuracy.</span>
            <input
              className="sr-only"
              type="file"
              accept=".fdx,.txt,.text,.pdf,.docx"
              onChange={(event) => {
                handleUpload(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-studio-300">{parseMessage}</p>
            <button type="button" onClick={loadSample} className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-studio-100 transition hover:border-amberline/35">
              <FileScan className="h-4 w-4" />
              Load Sample Draft
            </button>
          </div>
        </Panel>

        <Panel>
          <SectionHeader eyebrow="Parse Summary" title="Draft Intelligence" />
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryMetric label="Scenes" value={currentScript?.scenes.length ?? 0} />
            <SummaryMetric label="Characters" value={currentScript?.characters.length ?? 0} />
            <SummaryMetric label="Environments" value={currentScript?.environments.length ?? 0} />
            <SummaryMetric label="Props" value={currentScript?.props.length ?? 0} />
            <SummaryMetric label="Stunt Beats" value={currentScript?.stuntBeats.length ?? 0} />
            <SummaryMetric label="VFX Beats" value={currentScript?.vfxBeats.length ?? 0} />
          </div>
          <div className="mt-5 rounded border border-white/10 bg-white/[0.03] p-4">
            <p className="font-display text-xs uppercase tracking-[0.18em] text-studio-300">Compare Against</p>
            <select className="field mt-2" value={previousId} onChange={(event) => setPreviousId(event.target.value)} disabled={!compareOptions.length}>
              {compareOptions.length ? compareOptions.map((script) => (
                <option key={script.id} value={script.id}>{script.versionName} / {script.fileName}</option>
              )) : <option>No previous script available</option>}
            </select>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="xl:col-span-2">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeader eyebrow="Workspace" title="Script Analysis" />
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {([
                ["scenes", "Scenes"],
                ["inspector", "Inspector"],
                ["elements", "Elements"],
                ["diff", "Diff"]
              ] as Array<[WorkspaceTab, string]>).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setWorkspaceTab(tab)}
                  className={`rounded border px-4 py-2 text-xs font-semibold uppercase transition ${workspaceTab === tab ? "border-amberline/60 bg-amberline/10 text-amberline" : "border-white/10 bg-white/[0.03] text-studio-300 hover:border-white/25"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {workspaceTab === "scenes" ? (
            <div>
              <SectionHeader eyebrow="Scene Breakdown" title="Parsed Scenes" />
              <div className="data-scroll">
                <table className="data-table min-w-[860px] border-separate border-spacing-y-2">
                  <thead className="font-display text-xs uppercase tracking-[0.14em] text-studio-300">
                    <tr>
                      <th className="px-3 py-2">Scene</th>
                      <th className="px-3 py-2">Slugline</th>
                      <th className="px-3 py-2">Characters</th>
                      <th className="px-3 py-2">Environment</th>
                      <th className="px-3 py-2">Props</th>
                      <th className="px-3 py-2">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentScript?.scenes.map((scene) => (
                      <tr
                        key={scene.id}
                        onClick={() => {
                          setSelectedSceneId(scene.id);
                          setWorkspaceTab("inspector");
                        }}
                        className={`cursor-pointer rounded transition ${selectedScene?.id === scene.id ? "bg-amberline/12" : "bg-white/[0.03] hover:bg-white/[0.06]"}`}
                      >
                        <td className="rounded-l border-y border-l border-white/10 px-3 py-3 font-display text-sm text-amberline">{scene.number}</td>
                        <td className="border-y border-white/10 px-3 py-3 text-sm font-semibold text-studio-100">{scene.slugline}</td>
                        <td className="border-y border-white/10 px-3 py-3 text-sm text-studio-300">{scene.characters.slice(0, 4).join(", ") || "None detected"}</td>
                        <td className="border-y border-white/10 px-3 py-3 text-sm text-studio-300">{scene.location}</td>
                        <td className="border-y border-white/10 px-3 py-3 text-sm text-studio-300">{scene.props.slice(0, 3).join(", ") || "None detected"}</td>
                        <td className="rounded-r border-y border-r border-white/10 px-3 py-3"><RiskBadge level={scene.riskLevel} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!currentScript ? <div className="mt-4"><EmptyState label="No parsed scenes yet. Upload a script for this project to populate the breakdown." /></div> : null}
              </div>
            </div>
          ) : null}

          {workspaceTab === "inspector" ? (
            <div>
              <SectionHeader eyebrow="Scene Inspector" title={selectedScene ? `Scene ${selectedScene.number}` : "No Scene"} />
              {selectedScene ? <SceneInspector scene={selectedScene} /> : <EmptyState label="Select a scene to inspect extracted production elements." />}
            </div>
          ) : null}

          {workspaceTab === "elements" ? (
            <div>
              <SectionHeader eyebrow="Entity Intelligence" title="Extracted Elements" />
              <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
                {(["characters", "environments", "props", "stunts", "vfx"] as EntityTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setEntityTab(tab)}
                    className={`rounded border px-3 py-2 text-xs font-semibold uppercase transition ${entityTab === tab ? "border-amberline/60 bg-amberline/10 text-amberline" : "border-white/10 bg-white/[0.03] text-studio-300 hover:border-white/25"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {entityRows.length ? entityRows.map((row) => (
                  <div key={row.name} className="min-w-0 rounded border border-white/10 bg-white/[0.03] px-3 py-3">
                    <p className="break-words text-sm font-semibold leading-5 text-studio-100">{row.name}</p>
                    <p className="mt-2 font-display text-xs uppercase text-studio-300">{row.count} scenes</p>
                  </div>
                )) : <EmptyState label="No entities detected in this category." />}
              </div>
            </div>
          ) : null}

          {workspaceTab === "diff" ? (
            <div>
              <SectionHeader eyebrow="Production Diff" title="What The New Draft Changes" />
              {diff ? (
                <>
                  <DiffSummary diff={diff} />
                  <div className="mt-5 space-y-3">
                    {diff.diffs.filter((item) => item.status !== "stable").map((item) => (
                      <DiffCard key={item.id} item={item} />
                    ))}
                  </div>
                </>
              ) : <EmptyState label="Upload at least one script. Upload a second draft to compare within this project." />}
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-white/10 bg-white/[0.03] p-4">
      <p className="font-display text-xs uppercase tracking-[0.12em] text-studio-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-studio-100">{value}</p>
    </div>
  );
}

function SceneInspector({ scene }: { scene: ParsedScriptScene }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-xs uppercase tracking-[0.18em] text-amberline">{scene.interiorExterior} / {scene.timeOfDay}</p>
        <h3 className="mt-2 text-xl font-semibold text-studio-100">{scene.location}</h3>
      </div>
      <div className="max-h-56 overflow-auto rounded border border-white/10 bg-studio-950/50 p-4 text-sm leading-6 text-studio-300">
        {scene.text || "No scene text available."}
      </div>
      <InspectorGroup title="Characters" items={scene.characters} />
      <InspectorGroup title="Environments" items={scene.environments} />
      <InspectorGroup title="Props" items={scene.props} />
      <InspectorGroup title="Stunt Beats" items={scene.stuntBeats} />
      <InspectorGroup title="VFX Beats" items={scene.vfxBeats} />
    </div>
  );
}

function InspectorGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 font-display text-xs uppercase tracking-[0.16em] text-studio-300">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.length ? items.map((item) => (
          <span key={item} className="min-w-0 max-w-full break-words rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-xs leading-5 text-studio-100">{item}</span>
        )) : <span className="text-sm text-studio-300">None detected</span>}
      </div>
    </div>
  );
}

function DiffSummary({ diff }: { diff: ScriptProductionDiff }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <SummaryMetric label="Scenes Added" value={diff.scenesAdded} />
      <SummaryMetric label="Scenes Changed" value={diff.scenesChanged} />
      <SummaryMetric label="Locations Changed" value={diff.locationsChanged} />
      <SummaryMetric label="High Risk" value={diff.highRiskChanges} />
    </div>
  );
}

function DiffCard({ item }: { item: ScriptProductionDiff["diffs"][number] }) {
  const title = item.status === "added"
    ? `Scene ${item.sceneNumber} added: ${item.afterSlugline}`
    : item.status === "removed"
      ? `Scene ${item.sceneNumber} removed: ${item.beforeSlugline}`
      : `Scene ${item.sceneNumber}: ${item.beforeSlugline} -> ${item.afterSlugline}`;

  return (
    <div className="rounded border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.16em] text-amberline">{item.status}</p>
          <h3 className="mt-2 font-semibold text-studio-100">{title}</h3>
        </div>
        <RiskBadge level={item.riskLevel} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <DiffList label="Characters Added" items={item.charactersAdded} />
        <DiffList label="Props Added" items={item.propsAdded} />
        <DiffList label="Environment Changes" items={[...item.environmentsAdded, ...item.environmentsRemoved.map((value) => `Removed: ${value}`)]} />
      </div>
      <div className="mt-4">
        <p className="mb-2 font-display text-xs uppercase tracking-[0.16em] text-studio-300">Production Impact</p>
        {item.productionImpact.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {item.productionImpact.map((impact) => (
              <div key={impact} className="flex min-w-0 items-start gap-2 rounded border border-ember/25 bg-ember/10 px-3 py-2 text-sm leading-6 text-studio-100">
                <AlertTriangle className="h-4 w-4 shrink-0 text-ember" />
                <span className="min-w-0 break-words">{impact}</span>
              </div>
            ))}
          </div>
        ) : <StatusBadge status="stable" />}
      </div>
    </div>
  );
}

function DiffList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded border border-white/10 bg-studio-950/40 p-3">
      <p className="font-display text-xs uppercase text-studio-300">{label}</p>
      <p className="mt-2 min-w-0 break-words text-sm leading-6 text-studio-100">{items.length ? items.join(", ") : "None"}</p>
    </div>
  );
}

function getEntityRows(script: ParsedScriptVersion, tab: EntityTab) {
  const values = tab === "characters"
    ? script.characters
    : tab === "environments"
      ? script.environments
      : tab === "props"
        ? script.props
        : tab === "stunts"
          ? unique(script.stuntBeats)
          : unique(script.vfxBeats);

  return values.map((name) => ({
    name,
    count: script.scenes.filter((scene) => sceneContains(scene, name, tab)).length
  }));
}

function sceneContains(scene: ParsedScriptScene, value: string, tab: EntityTab) {
  if (tab === "characters") return scene.characters.includes(value);
  if (tab === "environments") return scene.environments.includes(value);
  if (tab === "props") return scene.props.includes(value);
  if (tab === "stunts") return scene.stuntBeats.includes(value);
  return scene.vfxBeats.includes(value);
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function getHammerDefaultVersions() {
  const sample = parseScriptText(sampleScriptText, { projectId: "hammer", versionName: "S-05 Yellow", fileName: "sample-hammer-s05.txt" });
  return [...parsedScriptBaselines, sample];
}

function getCompareOptions(projectId: string, versions: ParsedScriptVersion[], currentScript: ParsedScriptVersion | null) {
  const projectVersions = versions.filter((script) => script.id !== currentScript?.id);
  if (projectId === "hammer") {
    return [...parsedScriptBaselines, ...projectVersions.filter((script) => !parsedScriptBaselines.some((baseline) => baseline.id === script.id))];
  }
  return projectVersions;
}

function getDefaultPreviousId(projectId: string, versions: ParsedScriptVersion[], currentScript: ParsedScriptVersion | null) {
  const options = getCompareOptions(projectId, versions, currentScript);
  return options[options.length - 1]?.id ?? "";
}

function upsertScriptVersion(versions: ParsedScriptVersion[], script: ParsedScriptVersion) {
  return [...versions.filter((version) => version.id !== script.id), script];
}

async function uploadScriptToApi(input: { projectId: string; versionName: string; uploadedBy: string; file: File }) {
  try {
    const formData = new FormData();
    formData.set("projectId", input.projectId);
    formData.set("versionName", input.versionName);
    formData.set("uploadedBy", input.uploadedBy);
    formData.set("file", input.file);

    const response = await fetch("/api/script-versions", {
      method: "POST",
      body: formData
    });

    if (!response.ok) return null;
    const data = await response.json();
    return {
      parsed: data.parsed as ParsedScriptVersion | null,
      ocrRequired: Boolean(data.ocrRequired),
      message: typeof data.message === "string" ? data.message : undefined
    };
  } catch {
    return null;
  }
}
