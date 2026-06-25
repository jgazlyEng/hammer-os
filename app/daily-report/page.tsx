import { AppShell } from "@/components/app-shell";
import { ProjectDataBoundary } from "@/components/project-data-boundary";
import { ChangeCard, DependencyPanel, Panel, RiskBadge, SectionHeader, StatusBadge } from "@/components/ui";
import { approvals, changeRequests, departments, getDepartmentName, previzShots, risks, scenes, sequences } from "@/lib/mock-data";

export default function DailyReportPage() {
  const invalidatedPreviz = previzShots.filter((previz) => previz.status === "outdated" || previz.status === "blocked");
  const approvalsCompleted = approvals.filter((approval) => approval.state === "approved");
  const affectedDepartments = departments.filter((department) => department.status === "at-risk" || department.status === "blocked" || department.status === "watch");
  const mostImpactedSequence = sequences.find((sequence) => sequence.id === "seq-03") ?? sequences[0];
  const topRisks = [...risks].sort((a, b) => riskWeight(b.level) - riskWeight(a.level)).slice(0, 5);

  return (
    <AppShell>
      <ProjectDataBoundary moduleName="Daily Executive Report">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.24em] text-amberline">Daily Executive Report</p>
          <h1 className="mt-2 text-3xl font-semibold text-studio-100">June 3, 2026</h1>
        </div>
        <p className="text-sm text-studio-300">Prepared for production meeting</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard label="Today Changes" value={changeRequests.length} />
        <ReportCard label="Previz Invalidated" value={invalidatedPreviz.length} />
        <ReportCard label="Approvals Completed" value={approvalsCompleted.length} />
        <ReportCard label="Departments Affected" value={affectedDepartments.length} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.75fr]">
        <Panel>
          <SectionHeader title="Today's Changes" />
          <div className="space-y-3">
            {changeRequests.map((request) => {
              const scene = scenes.find((item) => item.id === request.sceneId);
              return <ChangeCard key={request.id} title={request.description} detail={`${request.reason} Affects Scene ${scene?.number}: ${scene?.slugline}.`} risk={request.riskLevel} meta={`${request.submittedBy} / ${request.priority}`} />;
            })}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Most Impacted Sequence" />
          <div className="rounded border border-red-300/30 bg-red-500/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xs uppercase tracking-[0.18em] text-amberline">{mostImpactedSequence.code}</p>
                <h3 className="mt-2 text-xl font-semibold text-studio-100">{mostImpactedSequence.title}</h3>
              </div>
              <RiskBadge level={mostImpactedSequence.stability} />
            </div>
            <p className="mt-3 text-sm leading-6 text-studio-300">{mostImpactedSequence.logline}</p>
          </div>
          <div className="mt-4">
            <DependencyPanel
              items={[
                { label: "Script", value: mostImpactedSequence.scriptStatus, state: "bad" },
                { label: "Previz", value: mostImpactedSequence.previzStatus, state: "bad" },
                { label: "Stunts", value: mostImpactedSequence.stuntsStatus, state: "bad" },
                { label: "Approval", value: mostImpactedSequence.approvalState, state: "warn" }
              ]}
            />
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel>
          <SectionHeader title="Previz Shots Invalidated" />
          <div className="space-y-3">
            {invalidatedPreviz.map((previz) => (
              <div key={previz.id} className="rounded border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-studio-100">{previz.code}</p>
                    <p className="text-sm text-studio-300">Owner: {previz.owner}</p>
                  </div>
                  <StatusBadge status={previz.status} />
                </div>
                {previz.outdatedReason ? <p className="mt-3 text-sm text-amberline">{previz.outdatedReason}</p> : null}
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <SectionHeader title="Top 5 Risks" />
          <div className="space-y-3">
            {topRisks.map((risk) => (
              <div key={risk.id} className="rounded border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-studio-100">{risk.title}</h3>
                  <RiskBadge level={risk.level} />
                </div>
                <p className="mt-2 text-sm text-studio-300">{risk.detail}</p>
                <p className="mt-2 text-xs text-amberline">{getDepartmentName(risk.owner.toLowerCase()) === risk.owner.toLowerCase() ? risk.owner : risk.owner}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      </ProjectDataBoundary>
    </AppShell>
  );
}

function ReportCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Panel>
      <p className="font-display text-xs uppercase tracking-[0.18em] text-studio-300">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-studio-100">{value}</p>
    </Panel>
  );
}

function riskWeight(level: string) {
  return level === "critical" ? 4 : level === "high" ? 3 : level === "medium" ? 2 : 1;
}
