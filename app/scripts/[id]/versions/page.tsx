import { HammerOS } from "@/components/hammer-os";

export default function ScriptVersionsPage({ params }: { params: { id: string } }) {
  return <HammerOS view="script-versions" id={params.id} />;
}
