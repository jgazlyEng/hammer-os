import { HammerOS } from "@/components/hammer-os";

export default function ScriptDiffPage({ params }: { params: { id: string } }) {
  return <HammerOS view="script-diff" id={params.id} />;
}
