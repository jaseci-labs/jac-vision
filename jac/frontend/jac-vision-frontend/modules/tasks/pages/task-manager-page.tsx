"use client";

import { ProtectedRoute } from "@/ds/wrappers/prtoected-auth";
import { TaskHeader } from "../../../ds/molecules/task-header";
import { TaskSidebar } from "../../../ds/molecules/task-sidebar";
import { TaskList } from "../../../ds/organisms/task-list";
import { DashboardTemplate } from "../../../ds/templates/dashboard-template";
import { useTaskManager } from "../hooks/use-task-manger";

export function TaskManagerPage() {
  const { tasks, stats, actions } = useTaskManager();

  return (
    <ProtectedRoute>
      <DashboardTemplate
        header={<TaskHeader />}
        sidebar={<TaskSidebar stats={stats} />}
      >
        <TaskList
          tasks={tasks}
          onAddTask={actions.addTask}
          onUpdateTask={actions.updateTask}
          onDeleteTask={actions.deleteTask}
          onToggleComplete={actions.toggleComplete}
        />
      </DashboardTemplate>
    </ProtectedRoute>
  );
}
