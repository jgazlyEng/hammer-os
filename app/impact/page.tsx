import { AppShell } from "@/components/app-shell";
import { ImpactForm } from "@/app/impact/impact-form";
import { ProjectDataBoundary } from "@/components/project-data-boundary";

export default function ImpactPage() {
  return (
    <AppShell>
      <ProjectDataBoundary moduleName="Change Impact Engine">
      <ImpactForm />
      </ProjectDataBoundary>
    </AppShell>
  );
}
