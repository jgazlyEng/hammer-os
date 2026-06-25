import { AppShell } from "@/components/app-shell";
import { ProjectDataBoundary } from "@/components/project-data-boundary";
import { ApprovalBadge, Panel, ProgressBar, RiskBadge, SectionHeader, SequenceCard, StatusBadge } from "@/components/ui";
import { approvals, getDepartmentName, risks, scenes, sequences } from "@/lib/mock-data";

const statusKeys = [
  ["Treatment", "treatmentStatus"],
  ["Script", "scriptStatus"],
  ["Storyboard", "storyboardStatus"],
  ["Previz", "previzStatus"],
  ["VFX", "vfxStatus"],
  ["Stunts", "stuntsStatus"]
] as const;

export default function SequencesPage() {
  return (
    <AppShell>
      <ProjectDataBoundary moduleName="Sequence Dashboard">
      <SectionHeader eyebrow="Sequence Dashboard" title="All Sequences" />
      <div className="grid gap-5">
        {sequences.map((sequence) => {
          const linkedScenes = scenes.filter((scene) => scene.sequenceId === sequence.id);
          const sequenceRisks = risks.filter((risk) => risk.sequenceId === sequence.id);
          const sequenceApprovals = approvals.filter((approval) => approval.sequenceId === sequence.id);
          return (
            <Panel key={sequence.id}>
              <div className="grid gap-5 xl:grid-cols-[0.9fr_1.35fr]">
                <SequenceCard sequence={sequence} href={`/sequences/${sequence.id}`} />
                <div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {statusKeys.map(([label, key]) => (
                      <div key={label} className="rounded border border-white/10 bg-white/[0.03] p-3">
                        <p className="mb-2 font-display text-xs uppercase text-studio-300">{label}</p>
                        <StatusBadge status={sequence[key]} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="mb-2 font-display text-xs uppercase text-studio-300">Linked Scenes</p>
                      <p className="text-2xl font-semibold text-studio-100">{linkedScenes.length}</p>
                    </div>
                    <div>
                      <p className="mb-2 font-display text-xs uppercase text-studio-300">Open Risks</p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-semibold text-studio-100">{sequenceRisks.length}</p>
                        {sequenceRisks[0] ? <RiskBadge level={sequenceRisks[0].level} /> : null}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 font-display text-xs uppercase text-studio-300">Approval</p>
                      <ApprovalBadge state={sequence.approvalState} />
                    </div>
                  </div>
                  <div className="mt-5">
                    <ProgressBar value={sequence.completion} tone={sequence.stability === "low" ? "signal" : sequence.stability === "medium" ? "amber" : "ember"} />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {sequence.departmentIds.map((departmentId) => (
                      <span key={departmentId} className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-studio-300">{getDepartmentName(departmentId)}</span>
                    ))}
                  </div>
                  {sequenceApprovals.length ? (
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {sequenceApprovals.map((approval) => (
                        <div key={approval.id} className="rounded border border-white/10 bg-white/[0.03] p-3 text-sm text-studio-300">
                          <span className="text-studio-100">{getDepartmentName(approval.departmentId)}</span> / {approval.owner} / due {approval.due}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
      </ProjectDataBoundary>
    </AppShell>
  );
}
