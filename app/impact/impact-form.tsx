"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { DependencyPanel, Panel, RiskBadge, SectionHeader } from "@/components/ui";
import { buildImpactReport, getDepartmentName, scenes, sequences } from "@/lib/mock-data";
import type { ImpactReport, Priority } from "@/lib/types";

export function ImpactForm() {
  const [submittedBy, setSubmittedBy] = useState("Producer");
  const [sequenceId, setSequenceId] = useState("seq-03");
  const [sceneId, setSceneId] = useState("sc-18");
  const [description, setDescription] = useState("Add a train arrival during the exchange and move the case handoff onto the platform edge.");
  const [reason, setReason] = useState("Increase pressure and make the betrayal visible to the crowd.");
  const [priority, setPriority] = useState<Priority>("urgent");
  const [report, setReport] = useState<ImpactReport | null>(buildImpactReport("seq-03", "sc-18", "urgent"));

  const sceneOptions = useMemo(() => scenes.filter((scene) => scene.sequenceId === sequenceId), [sequenceId]);

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReport(buildImpactReport(sequenceId, sceneId, priority));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1fr]">
      <Panel>
        <SectionHeader eyebrow="Change Impact Engine" title="Create Change Request" />
        <form onSubmit={submitForm} className="space-y-4">
          <Field label="Submitted By">
            <input value={submittedBy} onChange={(event) => setSubmittedBy(event.target.value)} className="field" />
          </Field>
          <Field label="Affected Sequence">
            <select
              value={sequenceId}
              onChange={(event) => {
                const nextSequence = event.target.value;
                setSequenceId(nextSequence);
                setSceneId(scenes.find((scene) => scene.sequenceId === nextSequence)?.id ?? "");
              }}
              className="field"
            >
              {sequences.map((sequence) => (
                <option key={sequence.id} value={sequence.id}>{sequence.code} / {sequence.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Affected Scene">
            <select value={sceneId} onChange={(event) => setSceneId(event.target.value)} className="field">
              {sceneOptions.map((scene) => (
                <option key={scene.id} value={scene.id}>Scene {scene.number} / {scene.slugline}</option>
              ))}
            </select>
          </Field>
          <Field label="Change Description">
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="field min-h-28" />
          </Field>
          <Field label="Reason">
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} className="field min-h-20" />
          </Field>
          <Field label="Priority">
            <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className="field">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>
          <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-amberline px-4 py-3 font-semibold text-studio-950 transition hover:bg-[#f1c974]">
            <Send className="h-4 w-4" />
            Generate Impact Report
          </button>
        </form>
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Mock Report" title="What Breaks" />
        {report ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <ReportMetric label="Estimated Hours" value={`${report.estimatedHours}`} />
              <ReportMetric label="Budget Impact" value={report.budgetImpact} />
              <ReportMetric label="Schedule Impact" value={report.scheduleImpact} />
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display text-xs uppercase tracking-[0.18em] text-studio-300">Risk Level</span>
              <RiskBadge level={report.riskLevel} />
            </div>
            <DependencyPanel items={[
              { label: "Script", value: report.affectedScriptReferences.join(" / "), state: "bad" },
              { label: "Storyboards", value: report.affectedStoryboardPanels.join(", ") || "No boards linked", state: report.affectedStoryboardPanels.length ? "bad" : "warn" },
              { label: "Previz", value: report.affectedPrevizShots.join(", ") || "No previz linked", state: report.affectedPrevizShots.length ? "bad" : "warn" },
              { label: "Departments", value: report.affectedDepartments.join(", ") || getDepartmentName("story"), state: "bad" }
            ]} />
            <div className="rounded border border-amberline/30 bg-amberline/10 p-4">
              <p className="font-display text-xs uppercase tracking-[0.18em] text-amberline">Request Snapshot</p>
              <p className="mt-2 text-sm leading-6 text-studio-100">{submittedBy} requests: {description}</p>
              <p className="mt-2 text-sm text-studio-300">Reason: {reason}</p>
            </div>
          </div>
        ) : null}
      </Panel>
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

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/[0.03] p-4">
      <p className="font-display text-xs uppercase text-studio-300">{label}</p>
      <p className="mt-2 text-lg font-semibold text-studio-100">{value}</p>
    </div>
  );
}
