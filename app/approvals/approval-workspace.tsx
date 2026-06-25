"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleSlash, Clock, ShieldCheck } from "lucide-react";
import { ApprovalBadge, Panel, SectionHeader } from "@/components/ui";
import { approvals as seededApprovals, departments, getDepartmentName, sequences } from "@/lib/mock-data";
import { getActiveProjectId, PROJECTS_UPDATED_EVENT } from "@/lib/project-store";
import type { ApprovalState } from "@/lib/types";

interface ApprovalRecord {
  id: string;
  projectId?: string;
  sequenceId?: string | null;
  departmentId?: string | null;
  state: "approved" | "pending" | "needs_review" | "blocked";
  owner?: string | null;
  due?: string | null;
  decisionNote?: string | null;
  sequence?: { code: string; title: string } | null;
  department?: { name: string; lead?: string | null } | null;
  decidedBy?: { name: string; email: string } | null;
}

export function ApprovalWorkspace() {
  const [activeProjectId, setActiveProjectId] = useState("hammer");
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [message, setMessage] = useState("Department approvals are scoped to the active project.");
  const [note, setNote] = useState("");

  useEffect(() => {
    function syncProject() {
      setActiveProjectId(getActiveProjectId());
    }

    syncProject();
    window.addEventListener(PROJECTS_UPDATED_EVENT, syncProject);
    window.addEventListener("storage", syncProject);
    return () => {
      window.removeEventListener(PROJECTS_UPDATED_EVENT, syncProject);
      window.removeEventListener("storage", syncProject);
    };
  }, []);

  useEffect(() => {
    loadApprovals(activeProjectId);
  }, [activeProjectId]);

  const pending = useMemo(() => approvals.filter((approval) => approval.state !== "approved"), [approvals]);
  const completed = useMemo(() => approvals.filter((approval) => approval.state === "approved"), [approvals]);

  async function loadApprovals(projectId: string) {
    if (projectId === "hammer") {
      setApprovals(toSeedApprovals());
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/approvals`, { cache: "no-store" });
      if (!response.ok) throw new Error("API unavailable");
      const data = await response.json();
      setApprovals(Array.isArray(data.approvals) ? data.approvals : []);
      setMessage("Loaded approvals from the database.");
    } catch {
      setApprovals([]);
      setMessage("No database approvals found yet for this project.");
    }
  }

  async function decide(approvalId: string, state: ApprovalRecord["state"]) {
    setApprovals((current) => current.map((approval) => (approval.id === approvalId ? { ...approval, state, decisionNote: note } : approval)));

    try {
      const response = await fetch(`/api/approvals/${approvalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, decisionNote: note })
      });
      if (!response.ok) throw new Error("Decision did not persist");
      const data = await response.json();
      setApprovals((current) => current.map((approval) => (approval.id === approvalId ? data.approval : approval)));
      setMessage("Approval decision saved and audited.");
    } catch {
      setMessage("Decision updated in this view. Database persistence requires a configured project approval record.");
    } finally {
      setNote("");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.24em] text-amberline">Department Approval Workflow</p>
          <h1 className="mt-2 text-3xl font-semibold text-studio-100 md:text-4xl">Production Sign-Offs</h1>
          <p className="mt-3 max-w-3xl text-studio-300">Track which departments have approved the current story, previz, and risk state before production commits to the change.</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-studio-850 px-4 py-3 font-display text-sm text-studio-300">
          {pending.length} pending / {completed.length} complete
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ApprovalMetric icon={<Clock className="h-4 w-4" />} label="Pending" value={pending.length} />
        <ApprovalMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Approved" value={completed.length} />
        <ApprovalMetric icon={<CircleSlash className="h-4 w-4" />} label="Blocked" value={approvals.filter((approval) => approval.state === "blocked").length} />
      </div>

      <Panel className="mt-6">
        <SectionHeader eyebrow="Decision Note" title="Approval Context" />
        <textarea
          className="field min-h-24"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Example: Approved if subway gag remains locked by Friday and VFX receives clean plates."
        />
        <p className="mt-3 text-sm text-studio-300">{message}</p>
      </Panel>

      <div className="mt-6 grid gap-4">
        {approvals.length ? approvals.map((approval) => (
          <Panel key={approval.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-display text-xs uppercase tracking-[0.18em] text-amberline">{approval.sequence?.code ?? sequenceLabel(approval.sequenceId)}</p>
                  <ApprovalBadge state={toUiApprovalState(approval.state)} />
                </div>
                <h2 className="mt-2 text-xl font-semibold text-studio-100">{approval.department?.name ?? getDepartmentName(approval.departmentId ?? "")}</h2>
                <p className="mt-2 text-sm leading-6 text-studio-300">
                  Owner: {approval.owner ?? approval.department?.lead ?? "Unassigned"} / Due: {formatDue(approval.due)}
                </p>
                {approval.decisionNote ? <p className="mt-3 rounded border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-studio-300">{approval.decisionNote}</p> : null}
                {approval.decidedBy ? <p className="mt-2 text-xs text-studio-400">Last decision by {approval.decidedBy.name}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <DecisionButton label="Approve" onClick={() => decide(approval.id, "approved")} />
                <DecisionButton label="Needs Review" onClick={() => decide(approval.id, "needs_review")} />
                <DecisionButton label="Block" danger onClick={() => decide(approval.id, "blocked")} />
              </div>
            </div>
          </Panel>
        )) : (
          <Panel>
            <div className="flex items-center gap-3 text-studio-300">
              <ShieldCheck className="h-5 w-5 text-amberline" />
              No approvals have been created for this project yet.
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

function ApprovalMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-studio-850 p-4">
      <div className="flex items-center gap-2 font-display text-xs uppercase tracking-[0.16em] text-studio-300">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold text-studio-100">{value}</p>
    </div>
  );
}

function DecisionButton({ label, danger, onClick }: { label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${danger ? "border-ember/35 bg-ember/10 text-ember hover:border-ember/70" : "border-white/10 bg-white/[0.03] text-studio-100 hover:border-amberline/40"}`}
    >
      {label}
    </button>
  );
}

function toSeedApprovals(): ApprovalRecord[] {
  return seededApprovals.map((approval) => ({
    ...approval,
    projectId: "hammer",
    state: approval.state.replace("-", "_") as ApprovalRecord["state"],
    department: departments.find((department) => department.id === approval.departmentId) ?? null,
    sequence: sequences.find((sequence) => sequence.id === approval.sequenceId) ?? null
  }));
}

function toUiApprovalState(state: ApprovalRecord["state"]): ApprovalState {
  return state.replace("_", "-") as ApprovalState;
}

function sequenceLabel(sequenceId?: string | null) {
  return sequences.find((sequence) => sequence.id === sequenceId)?.code ?? "Sequence TBD";
}

function formatDue(value?: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}
