import { HammerOS } from "@/components/hammer-os";

export default function ScriptDetailPage({ params }: { params: { id: string } }) {
  return <HammerOS view="script-detail" id={params.id} />;
}
