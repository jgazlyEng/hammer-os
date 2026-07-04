import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, Clock, Layers3 } from "lucide-react";
import { cn, pct } from "@/lib/utils";
import type { ApprovalState, RiskLevel, Status } from "@/lib/types";

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-white/10 bg-studio-850/72 p-3 shadow-glow", className)}>{children}</section>;
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="font-display text-[10px] uppercase tracking-[0.16em] text-amberline/80">{eyebrow}</p> : null}
        <h2 className="mt-0.5 text-[15px] font-semibold text-studio-100">{title}</h2>
      </div>
      {action}
    </div>
  );
}

const statusStyles: Record<Status, string> = {
  locked: "border-signal/40 bg-signal/12 text-signal",
  stable: "border-signal/35 bg-signal/10 text-signal",
  watch: "border-amberline/35 bg-amberline/10 text-amberline",
  "at-risk": "border-ember/40 bg-ember/10 text-ember",
  blocked: "border-red-400/40 bg-red-500/15 text-red-300",
  outdated: "border-zinc-300/35 bg-zinc-300/10 text-zinc-200"
};

const riskStyles: Record<RiskLevel, string> = {
  low: "border-signal/35 bg-signal/10 text-signal",
  medium: "border-amberline/35 bg-amberline/10 text-amberline",
  high: "border-ember/40 bg-ember/10 text-ember",
  critical: "border-red-300/45 bg-red-500/20 text-red-200"
};

const approvalStyles: Record<ApprovalState, string> = {
  approved: "border-signal/35 bg-signal/10 text-signal",
  pending: "border-amberline/35 bg-amberline/10 text-amberline",
  "needs-review": "border-ember/40 bg-ember/10 text-ember",
  blocked: "border-red-300/45 bg-red-500/20 text-red-200"
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={cn("status-badge inline-flex rounded border px-2 py-1 font-display text-[11px] uppercase", statusStyles[status])}>{status.replace("-", " ")}</span>;
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <span className={cn("status-badge inline-flex rounded border px-2 py-1 font-display text-[11px] uppercase", riskStyles[level])}>{level}</span>;
}

export function ApprovalBadge({ state }: { state: ApprovalState }) {
  return <span className={cn("status-badge inline-flex rounded border px-2 py-1 font-display text-[11px] uppercase", approvalStyles[state])}>{state.replace("-", " ")}</span>;
}

export function ProgressBar({ value, tone = "signal" }: { value: number; tone?: "signal" | "amber" | "ember" }) {
  const color = tone === "signal" ? "bg-signal" : tone === "amber" ? "bg-amberline" : "bg-ember";
  return (
    <div>
      <div className="mb-2 flex justify-between font-display text-xs text-studio-300">
        <span>Progress</span>
        <span>{pct(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-white/10">
        <div className={cn("h-full rounded", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function MetricCard({ label, value, sub, risk, href }: { label: string; value: string; sub?: string; risk?: RiskLevel; href?: string }) {
  const content = (
    <Panel className={cn("min-h-[88px]", href && "transition hover:border-amberline/40 hover:bg-studio-800/90")}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-[10px] uppercase tracking-[0.14em] text-studio-300">{label}</p>
        {risk ? <RiskBadge level={risk} /> : null}
      </div>
      <p className="mt-2 text-xl font-semibold text-studio-100">{value}</p>
      {sub ? <p className="mt-1 text-xs text-studio-300">{sub}</p> : null}
    </Panel>
  );

  return href ? <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-amberline/40">{content}</Link> : content;
}

export function SequenceCard({
  sequence,
  href,
  compact = false
}: {
  sequence: {
    id: string;
    code: string;
    title: string;
    logline: string;
    stability: RiskLevel;
    completion: number;
    approvalState: ApprovalState;
  };
  href?: string;
  compact?: boolean;
}) {
  const content = (
    <Panel className={cn("transition hover:border-amberline/35 hover:bg-studio-800/90", compact && "p-4")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.18em] text-amberline/80">{sequence.code}</p>
          <h3 className="mt-1.5 text-base font-semibold text-studio-100">{sequence.title}</h3>
        </div>
        <RiskBadge level={sequence.stability} />
      </div>
      <p className="mt-2 text-sm leading-6 text-studio-300">{sequence.logline}</p>
      <div className="mt-3">
        <ProgressBar value={sequence.completion} tone={sequence.stability === "low" ? "signal" : sequence.stability === "medium" ? "amber" : "ember"} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <ApprovalBadge state={sequence.approvalState} />
        {href ? <ArrowRight className="h-4 w-4 text-studio-300" /> : null}
      </div>
    </Panel>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export function ChangeCard({ title, detail, risk, meta }: { title: string; detail: string; risk: RiskLevel; meta: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.16em] text-studio-300">{meta}</p>
          <h3 className="mt-1.5 font-semibold text-studio-100">{title}</h3>
        </div>
        <RiskBadge level={risk} />
      </div>
      <p className="mt-2 text-sm leading-6 text-studio-300">{detail}</p>
    </div>
  );
}

export function DependencyPanel({ items }: { items: Array<{ label: string; value: string; state?: "ok" | "warn" | "bad" }> }) {
  const icon = {
    ok: <CircleCheck className="h-4 w-4 text-signal" />,
    warn: <Clock className="h-4 w-4 text-amberline" />,
    bad: <CircleAlert className="h-4 w-4 text-ember" />
  };

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="flex items-center gap-3 rounded border border-white/10 bg-white/[0.03] px-3 py-2">
          {icon[item.state ?? "ok"]}
          <span className="w-28 shrink-0 font-display text-xs uppercase text-studio-300">{item.label}</span>
          <span className="text-sm text-studio-100">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded border border-white/10 bg-white/[0.03] p-4 text-sm text-studio-300">
      <Layers3 className="h-4 w-4 text-amberline" />
      {label}
    </div>
  );
}
