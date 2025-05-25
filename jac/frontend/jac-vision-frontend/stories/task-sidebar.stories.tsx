import type { Meta, StoryObj } from "@storybook/react";
import { TaskSidebar } from "../ds/molecules/task-sidebar";

const meta: Meta<typeof TaskSidebar> = {
  title: "Molecules/TaskSidebar",
  component: TaskSidebar,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-64 border rounded-md p-4 bg-background">
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TaskSidebar>;

export const Default: Story = {
  args: {
    stats: {
      total: 10,
      active: 7,
      priorities: {
        high: 3,
        medium: 5,
        low: 2,
      },
    },
  },
};

export const Empty: Story = {
  args: {
    stats: {
      total: 0,
      active: 0,
      priorities: {
        high: 0,
        medium: 0,
        low: 0,
      },
    },
  },
};

export const MostlyComplete: Story = {
  args: {
    stats: {
      total: 12,
      active: 2,
      priorities: {
        high: 4,
        medium: 6,
        low: 2,
      },
    },
  },
};
