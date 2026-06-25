import { HammerOS } from "@/components/hammer-os";

export default function TasksPage({ searchParams }: { searchParams: { task?: string } }) {
  return <HammerOS view="tasks" selectedTaskId={searchParams.task} />;
}
