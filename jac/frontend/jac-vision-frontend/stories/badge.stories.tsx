import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "../ds/atoms/badge";

const meta: Meta<typeof Badge> = {
  title: "Atoms/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: "Badge",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary",
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Destructive",
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline",
  },
};

export const WithCustomClass: Story = {
  args: {
    children: "Custom",
    className: "bg-blue-500 hover:bg-blue-700 text-white",
  },
};

export const TaskPriorities: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge
        variant="outline"
        className="bg-green-100 text-green-800 hover:bg-green-100"
      >
        low
      </Badge>
      <Badge
        variant="outline"
        className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      >
        medium
      </Badge>
      <Badge
        variant="outline"
        className="bg-red-100 text-red-800 hover:bg-red-100"
      >
        high
      </Badge>
    </div>
  ),
};
