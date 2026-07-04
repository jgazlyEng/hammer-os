import { HammerOS } from "@/components/hammer-os";

export default function ScriptsPage({ searchParams }: { searchParams: { section?: string } }) {
  return <HammerOS view="scripts" scriptSection={searchParams.section} />;
}
