import { HammerOS } from "@/components/hammer-os";

export default function ScriptBreakdownPage({ params }: { params: { id: string } }) {
  return <HammerOS view="script-breakdown" id={params.id} />;
}
