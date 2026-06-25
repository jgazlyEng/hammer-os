import { AppShell } from "@/components/app-shell";
import { ProjectDataBoundary } from "@/components/project-data-boundary";
import { ChangeCard, Panel, SectionHeader } from "@/components/ui";
import { scenes, sceneChanges, scriptVersions, treatmentVersions } from "@/lib/mock-data";

export default function ScriptVersionsPage() {
  return (
    <AppShell>
      <ProjectDataBoundary moduleName="Script Version Tracking">
      <SectionHeader eyebrow="Script Version Tracking" title="Timeline and Scene-Level Changes" />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <SectionHeader title="Version Timeline" />
          <div className="space-y-4">
            {scriptVersions.map((version) => (
              <div key={version.id} className="border-l border-amberline/30 pl-4">
                <p className="font-display text-xs uppercase tracking-[0.18em] text-amberline">{version.date}</p>
                <h3 className="mt-2 text-lg font-semibold text-studio-100">{version.version}</h3>
                <p className="text-sm text-studio-300">{version.author}</p>
                <p className="mt-3 text-sm leading-6 text-studio-300">{version.summary}</p>
                <div className="mt-3 space-y-2">
                  {version.driftNotes.map((note) => (
                    <p key={note} className="rounded border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-amberline">{note}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel>
            <SectionHeader title="Treatment Alignment" />
            <div className="grid gap-3">
              {treatmentVersions.map((version) => (
                <div key={version.id} className="rounded border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-studio-100">{version.version}</p>
                    <p className="font-display text-sm text-amberline">{version.alignmentPercent}%</p>
                  </div>
                  <p className="mt-2 text-sm text-studio-300">{version.notes}</p>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <SectionHeader title="Scene Changes Between Versions" />
            <div className="space-y-3">
              {sceneChanges.map((change) => {
                const scene = scenes.find((item) => item.id === change.sceneId);
                return <ChangeCard key={change.id} title={`Scene ${scene?.number}: ${change.before} -> ${change.after}`} detail={`${change.impact} Creative drift: ${change.driftNote}`} risk={change.riskLevel} meta={`${change.fromVersion} to ${change.toVersion}`} />;
              })}
            </div>
          </Panel>
        </div>
      </div>
      </ProjectDataBoundary>
    </AppShell>
  );
}
