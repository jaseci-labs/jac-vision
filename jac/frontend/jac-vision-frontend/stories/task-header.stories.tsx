import type { Meta, StoryObj } from "@storybook/react";
import { TaskHeader } from "../ds/molecules/task-header";
import { ThemeProvider } from "@/ds/theme-provider";

const meta: Meta<typeof TaskHeader> = {
  title: "Molecules/TaskHeader",
  component: TaskHeader,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <div className="w-full max-w-3xl border rounded-md">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TaskHeader>;

export const Default: Story = {
  args: {
    title: "Task Manager",
  },
};

export const CustomTitle: Story = {
  args: {
    title: "My Tasks",
  },
};
