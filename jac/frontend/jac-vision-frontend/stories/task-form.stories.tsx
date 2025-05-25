import type { Meta, StoryObj } from "@storybook/react";
import { TaskForm } from "../ds/organisms/task-form";
import { action } from "@storybook/addon-actions";

const meta: Meta<typeof TaskForm> = {
  title: "Organisms/TaskForm",
  component: TaskForm,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TaskForm>;

export const NewTask: Story = {
  args: {
    onSubmit: action("onSubmit"),
    onCancel: action("onCancel"),
  },
};

export const EditTask: Story = {
  args: {
    initialValues: {
      id: "1",
      title: "Complete project documentation",
      description: "Write comprehensive documentation for the new feature",
      completed: false,
      priority: "medium",
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    },
    onSubmit: action("onSubmit"),
    onCancel: action("onCancel"),
  },
};
