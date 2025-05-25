"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "../ds/atoms/checkbox";
import { useState } from "react";

const meta: Meta<typeof Checkbox> = {
  title: "Atoms/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: () => <Checkbox id="terms" />,
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <label
        htmlFor="terms"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Accept terms and conditions
      </label>
    </div>
  ),
};

export const Checked: Story = {
  render: () => <Checkbox id="checked" defaultChecked />,
};

export const Disabled: Story = {
  render: () => <Checkbox id="disabled" disabled />,
};

export const DisabledChecked: Story = {
  render: () => <Checkbox id="disabled-checked" disabled defaultChecked />,
};

// Interactive example with state
const CheckboxWithState = () => {
  const [checked, setChecked] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="interactive"
          checked={checked}
          onCheckedChange={setChecked}
        />
        <label
          htmlFor="interactive"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Interactive checkbox
        </label>
      </div>
      <p className="text-sm text-muted-foreground">
        Checkbox is {checked ? "checked" : "unchecked"}
      </p>
    </div>
  );
};

export const Interactive: Story = {
  render: () => <CheckboxWithState />,
};
