import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProjectDataBoundary } from "@/components/project-data-boundary";
import { ApprovalBadge, DependencyPanel, EmptyState, Panel, ProgressBar, RiskBadge, SectionHeader, StatusBadge } from "@/components/ui";
import { approvals, getDepartmentName, previzShots, risks, scenes, sequences, shots } from "@/lib/mock-data";

export default function SequenceDetailPage({ params }: { params: { id: string } }) {
  const sequence = sequences.find((item) => item.id === params.id);
  if (!sequence) notFound();

  const linkedScenes = scenes.filter((scene) => scene.sequenceId === sequence.id);
  const linkedShots = shots.filter((shot) => linkedScenes.some((scene) => scene.id === shot.sceneId));
  const linkedPreviz = previzShots.filter((previz) => linkedShots.some((shot) => shot.id === previz.shotId));
  const openRisks = risks.filter((risk) => risk.sequenceId === sequence.id);
  const sequenceApprovals = approvals.filter((approval) => approval.sequenceId === sequence.id);

  return (
    <AppShell>
      <ProjectDataBoundary moduleName="Sequence Detail">
      <Link href="/sequences" className="font-display text-xs uppercase tracking-[0.18em] text-amberline">Back to sequences</Link>
      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.24em] text-studio-300">{sequence.code}</p>
          <h1 className="mt-2 text-3xl font-semibold text-studio-100 md:text-4xl">{sequence.title}</h1>
          <p className="mt-3 max-w-3xl text-studio-300">{sequence.logline}</p>
        </div>
        <div className="flex gap-2">
          <RiskBadge level={sequence.stability} />
          <ApprovalBadge state={sequence.approvalState} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Panel>
          <SectionHeader eyebrow="Department Status" title="Sequence Readiness" />
          <div className="grid gap-3 md:grid-cols-3">
            <StatusTile label="Treatment" status={sequence.treatmentStatus} />
            <StatusTile label="Script" status={sequence.scriptStatus} />
            <StatusTile label="Storyboard" status={sequence.storyboardStatus} />
            <StatusTile label="Previz" status={sequence.previzStatus} />
            <StatusTile label="VFX" status={sequence.vfxStatus} />
            <StatusTile label="Stunts" status={sequence.stuntsStatus} />
          </div>
          <div className="mt-6">
            <ProgressBar value={sequence.completion} tone={sequence.stability === "low" ? "signal" : sequence.stability === "medium" ? "amber" : "ember"} />
          </div>
        </Panel>

        <Panel>
          <SectionHeader eyebrow="Dependencies" title="Approval State" />
          <DependencyPanel
            items={sequenceApprovals.length ? sequenceApprovals.map((approval) => ({
              label: getDepartmentName(approval.departmentId),
              value: `${approval.state.replace("-", " ")} / ${approval.owner} / ${approval.due}`,
              state: approval.state === "approved" ? "ok" : approval.state === "pending" ? "warn" : "bad"
            })) : [{ label: "Approvals", value: "No open approvals", state: "ok" }]}
          />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel>
          <SectionHeader eyebrow="Linked Scenes" title="Script References" />
          <div className="space-y-3">
            {linkedScenes.map((scene) => (
              <Link key={scene.id} href={`/scene-linking?scene=${scene.id}`} className="block rounded border border-white/10 bg-white/[0.03] p-4 transition hover:border-amberline/35">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xs uppercase tracking-[0.18em] text-amberline">Scene {scene.number}</p>
                    <h3 className="mt-2 font-semibold text-studio-100">{scene.slugline}</h3>
                  </div>
                  <StatusBadge status={scene.status} />
                </div>
                <p className="mt-3 text-sm text-studio-300">{scene.summary}</p>
              </Link>
            ))}
          </div>
        </Panel>
        <Panel>
          <SectionHeader eyebrow="Previz Links" title="Shots and Previz" />
          <div className="space-y-3">
            {linkedPreviz.length ? linkedPreviz.map((previz) => {
              const shot = linkedShots.find((item) => item.id === previz.shotId);
              return (
                <div key={previz.id} className="rounded border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-xs uppercase text-studio-300">{shot?.code} / {shot?.storyboardPanel}</p>
                      <h3 className="mt-2 font-semibold text-studio-100">{previz.code}</h3>
                    </div>
                    <StatusBadge status={previz.status} />
                  </div>
                  <p className="mt-3 text-sm text-studio-300">{shot?.description}</p>
                  {previz.outdatedReason ? <p className="mt-2 text-sm text-amberline">{previz.outdatedReason}</p> : null}
                </div>
              );
            }) : <EmptyState label="No linked previz shots yet." />}
          </div>
        </Panel>
      </div>

      <Panel className="mt-6">
        <SectionHeader eyebrow="Open Risks" title="What Could Break" />
        <div className="grid gap-3 md:grid-cols-2">
          {openRisks.length ? openRisks.map((risk) => (
            <div key={risk.id} className="rounded border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-studio-100">{risk.title}</h3>
                <RiskBadge level={risk.level} />
              </div>
              <p className="mt-3 text-sm text-studio-300">{risk.detail}</p>
              <p className="mt-3 font-display text-xs uppercase text-amberline">{risk.owner}</p>
            </div>
          )) : <EmptyState label="No open risks on this sequence." />}
        </div>
      </Panel>
      </ProjectDataBoundary>
    </AppShell>
  );
}

function StatusTile({ label, status }: { label: string; status: Parameters<typeof StatusBadge>[0]["status"] }) {
  return (
    <div className="rounded border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 font-display text-xs uppercase tracking-[0.16em] text-studio-300">{label}</p>
      <StatusBadge status={status} />
    </div>
  );
}
