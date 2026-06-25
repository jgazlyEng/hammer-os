import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ProjectDataBoundary } from "@/components/project-data-boundary";
import { DependencyPanel, EmptyState, Panel, SectionHeader, StatusBadge } from "@/components/ui";
import { getDepartmentName, previzShots, scenes, sequences, shots } from "@/lib/mock-data";

export default function SceneLinkingPage({ searchParams }: { searchParams: { scene?: string } }) {
  const selectedScene = scenes.find((scene) => scene.id === searchParams.scene) ?? scenes.find((scene) => scene.id === "sc-18") ?? scenes[0];
  const sequence = sequences.find((item) => item.id === selectedScene.sequenceId);
  const linkedShots = shots.filter((shot) => shot.sceneId === selectedScene.id);
  const linkedPreviz = previzShots.filter((previz) => linkedShots.some((shot) => shot.id === previz.shotId));

  return (
    <AppShell>
      <ProjectDataBoundary moduleName="Scene-to-Previz Linking">
      <SectionHeader eyebrow="Scene-to-Previz Linking" title="Script Change Dependency View" />
      <div className="grid gap-6 xl:grid-cols-[0.48fr_1fr]">
        <Panel>
          <SectionHeader title="Selected Scene" />
          <div className="space-y-2">
            {scenes.map((scene) => (
              <Link
                key={scene.id}
                href={`/scene-linking?scene=${scene.id}`}
                className={`block rounded border p-3 transition ${scene.id === selectedScene.id ? "border-amberline/50 bg-amberline/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-xs uppercase text-amberline">Scene {scene.number}</p>
                    <p className="mt-1 text-sm font-semibold text-studio-100">{scene.slugline}</p>
                  </div>
                  <StatusBadge status={scene.status} />
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-display text-xs uppercase tracking-[0.22em] text-amberline">{sequence?.code} / Scene {selectedScene.number}</p>
                <h1 className="mt-2 text-3xl font-semibold text-studio-100">{selectedScene.slugline}</h1>
                <p className="mt-3 max-w-3xl text-studio-300">{selectedScene.summary}</p>
              </div>
              <StatusBadge status={selectedScene.status} />
            </div>
            {selectedScene.changedFrom ? (
              <div className="mt-5 rounded border border-ember/30 bg-ember/10 p-4">
                <p className="font-display text-xs uppercase tracking-[0.18em] text-ember">Changed From</p>
                <p className="mt-2 text-studio-100">{selectedScene.changedFrom}</p>
                <p className="mt-2 text-sm text-studio-300">{selectedScene.creativeDriftNote}</p>
              </div>
            ) : null}
          </Panel>

          <Panel>
            <SectionHeader title="Linked Shots and Previz" />
            <div className="grid gap-3">
              {linkedShots.length ? linkedShots.map((shot) => {
                const previz = linkedPreviz.find((item) => item.shotId === shot.id);
                return (
                  <div key={shot.id} className="rounded border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-display text-xs uppercase tracking-[0.16em] text-studio-300">{shot.code} / {shot.storyboardPanel}</p>
                        <h3 className="mt-2 font-semibold text-studio-100">{shot.description}</h3>
                      </div>
                      <div className="flex gap-2">
                        <StatusBadge status={shot.status} />
                        {previz ? <StatusBadge status={previz.status} /> : null}
                      </div>
                    </div>
                    {previz ? (
                      <div className="mt-4 rounded border border-white/10 bg-studio-950/40 p-3">
                        <p className="font-semibold text-studio-100">{previz.code}</p>
                        <p className="text-sm text-studio-300">Owner: {previz.owner} / Version {previz.version}</p>
                        {previz.outdatedReason ? <p className="mt-2 text-sm text-amberline">{previz.outdatedReason}</p> : null}
                      </div>
                    ) : <EmptyState label="No previz shot linked yet." />}
                  </div>
                );
              }) : <EmptyState label="No linked shots for this scene." />}
            </div>
          </Panel>

          <Panel>
            <SectionHeader title="Departments Impacted" />
            <DependencyPanel
              items={selectedScene.departmentIds.map((departmentId) => ({
                label: getDepartmentName(departmentId),
                value: departmentId === "locations" ? "Requires location clearance" : departmentId === "previz" ? "Previz update required" : departmentId === "stunts" ? "Safety layout review required" : "Review current change",
                state: ["locations", "stunts", "previz"].includes(departmentId) ? "bad" : "warn"
              }))}
            />
          </Panel>
        </div>
      </div>
      </ProjectDataBoundary>
    </AppShell>
  );
}
