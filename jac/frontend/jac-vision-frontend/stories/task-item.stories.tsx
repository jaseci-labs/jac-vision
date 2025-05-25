import type { Meta, StoryObj } from "@storybook/react";
import { TaskItem } from "../ds/molecules/task-item";
import { action } from "@storybook/addon-actions";

const meta: Meta<typeof TaskItem> = {
  title: "Molecules/TaskItem",
  component: TaskItem,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TaskItem>;

const mockTask = {
  id: "1",
  title: "Complete project documentation",
  description: "Write comprehensive documentation for the new feature",
  completed: false,
  priority: "medium" as const,
  dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
};

export const Default: Story = {
  args: {
    task: mockTask,
    onToggleComplete: action("onToggleComplete"),
    onEdit: action("onEdit"),
    onDelete: action("onDelete"),
  },
};

export const Completed: Story = {
  args: {
    task: { ...mockTask, completed: true },
    onToggleComplete: action("onToggleComplete"),
    onEdit: action("onEdit"),
    onDelete: action("onDelete"),
  },
};

export const HighPriority: Story = {
  args: {
    task: { ...mockTask, priority: "high" as const },
    onToggleComplete: action("onToggleComplete"),
    onEdit: action("onEdit"),
    onDelete: action("onDelete"),
  },
};
