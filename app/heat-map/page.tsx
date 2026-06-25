import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ProjectDataBoundary } from "@/components/project-data-boundary";
import { Panel, ProgressBar, RiskBadge, SectionHeader } from "@/components/ui";
import { risks, scenes, sequences } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";

const acts = ["Act I", "Act II", "Act III"] as const;

const heatStyles: Record<RiskLevel, string> = {
  low: "border-signal/45 bg-signal/15",
  medium: "border-amberline/45 bg-amberline/15",
  high: "border-ember/45 bg-ember/15",
  critical: "border-red-300/60 bg-red-500/20"
};

export default function HeatMapPage() {
  return (
    <AppShell>
      <ProjectDataBoundary moduleName="Story Stability Heat Map">
      <SectionHeader eyebrow="Story Stability Heat Map" title="Film Strip by Act" />
      <div className="space-y-6">
        {acts.map((act) => {
          const actSequences = sequences.filter((sequence) => sequence.act === act);
          return (
            <Panel key={act}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg uppercase tracking-[0.18em] text-studio-100">{act}</h2>
                <p className="text-sm text-studio-300">{actSequences.length} sequences</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {actSequences.map((sequence) => {
                  const linkedScenes = scenes.filter((scene) => scene.sequenceId === sequence.id);
                  const sequenceRisks = risks.filter((risk) => risk.sequenceId === sequence.id);
                  return (
                    <Link key={sequence.id} href={`/sequences/${sequence.id}`} className={cn("block rounded-lg border p-4 transition hover:scale-[1.01] hover:border-amberline/70", heatStyles[sequence.stability])}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-xs uppercase tracking-[0.16em] text-studio-300">{sequence.code}</p>
                          <h3 className="mt-2 font-semibold text-studio-100">{sequence.title}</h3>
                        </div>
                        <RiskBadge level={sequence.stability} />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <FilmCell label="Scenes" value={linkedScenes.length} />
                        <FilmCell label="Risks" value={sequenceRisks.length} />
                        <FilmCell label="Approval" value={sequence.approvalState === "approved" ? "OK" : "Hold"} />
                      </div>
                      <div className="mt-4">
                        <ProgressBar value={sequence.completion} tone={sequence.stability === "low" ? "signal" : sequence.stability === "medium" ? "amber" : "ember"} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Panel>
          );
        })}
      </div>
      </ProjectDataBoundary>
    </AppShell>
  );
}

function FilmCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-white/10 bg-black/20 px-2 py-3">
      <p className="font-display text-[10px] uppercase text-studio-300">{label}</p>
      <p className="mt-1 font-semibold text-studio-100">{value}</p>
    </div>
  );
}
