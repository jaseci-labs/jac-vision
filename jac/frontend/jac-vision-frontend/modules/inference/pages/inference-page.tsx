import { DashboardTemplate } from "@/ds/templates/dashboard-template";
import { TaskHeader } from "@/ds/molecules/task-header";
import { InferenceForm } from "@/ds/organisms/inference-form";
import { AppSidebar } from "@/ds/molecules/app-sidebar";

export default function InferencePage() {
  return (
    <DashboardTemplate
      sidebar={<AppSidebar />}
      header={<TaskHeader title="Jac Vision" />}
    >
      <InferenceForm />
    </DashboardTemplate>
  );
}
