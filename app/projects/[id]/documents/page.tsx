import { HammerOS } from "@/components/hammer-os";

export default function ProjectDocumentsPage({ params }: { params: { id: string } }) {
  return <HammerOS view="project-documents" id={params.id} />;
}
