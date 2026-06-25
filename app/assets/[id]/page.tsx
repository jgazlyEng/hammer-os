import { HammerOS } from "@/components/hammer-os";

export default function AssetDetailPage({ params }: { params: { id: string } }) {
  return <HammerOS view="asset-detail" id={params.id} />;
}
