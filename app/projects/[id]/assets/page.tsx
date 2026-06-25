import { HammerOS } from "@/components/hammer-os";

export default function ProjectAssetsPage({ params }: { params: { id: string } }) {
  return <HammerOS view="project-assets" id={params.id} />;
}
