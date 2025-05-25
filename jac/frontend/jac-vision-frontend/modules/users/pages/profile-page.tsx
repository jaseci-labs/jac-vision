"use client";

import type { Metadata } from "next";
import { ProfileSection } from "@/ds/organisms/profile-section";
import { DashboardTemplate } from "@/ds/templates/dashboard-template";
import { TaskHeader } from "@/ds/molecules/task-header";
import { TaskSidebar } from "@/ds/molecules/task-sidebar";
import { useTaskManager } from "@/modules/tasks/hooks/use-task-manger";

export const metadata: Metadata = {
  title: "Profile | Task Manager",
  description: "Manage your Task Manager profile",
};

export default function ProfilePage() {
  const { tasks, stats, actions } = useTaskManager();
  return (
    <DashboardTemplate
      sidebar={<TaskSidebar stats={stats} />}
      header={<TaskHeader title="Profile Management" />}
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Profile Settings</h1>
        <ProfileSection />
      </div>
    </DashboardTemplate>
  );
}
