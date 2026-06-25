import { HammerOS } from "@/components/hammer-os";

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  return <HammerOS view="project-detail" id={params.id} />;
}
