import { AppShell } from "@/components/app-shell";
import { ApprovalWorkspace } from "@/app/approvals/approval-workspace";

export default function ApprovalsPage() {
  return (
    <AppShell>
      <ApprovalWorkspace />
    </AppShell>
  );
}
