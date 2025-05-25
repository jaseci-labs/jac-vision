import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "../ds/atoms/textarea";

const meta: Meta<typeof Textarea> = {
  title: "Atoms/Textarea",
  component: Textarea,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {
    placeholder: "Type your message here...",
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full gap-1.5">
      <label htmlFor="message" className="text-sm font-medium">
        Your message
      </label>
      <Textarea placeholder="Type your message here." id="message" />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: "This textarea is disabled",
  },
};

export const WithValue: Story = {
  args: {
    value: "This is some default text that can be edited by the user.",
    rows: 4,
  },
};

export const WithError: Story = {
  render: () => (
    <div className="grid w-full gap-1.5">
      <label htmlFor="message-error" className="text-sm font-medium">
        Your message
      </label>
      <Textarea
        placeholder="Type your message here."
        id="message-error"
        className="border-red-500 focus-visible:ring-red-500"
      />
      <p className="text-sm text-red-500">Please enter a valid message.</p>
    </div>
  ),
};

export const WithHelperText: Story = {
  render: () => (
    <div className="grid w-full gap-1.5">
      <label htmlFor="message-helper" className="text-sm font-medium">
        Your message
      </label>
      <Textarea placeholder="Type your message here." id="message-helper" />
      <p className="text-sm text-muted-foreground">
        Your message will be sent to our team.
      </p>
    </div>
  ),
};

export const WithRows: Story = {
  args: {
    placeholder: "Type your message here...",
    rows: 10,
  },
};

export const ReadOnly: Story = {
  args: {
    placeholder: "This textarea is read-only",
    readOnly: true,
    value: "This is read-only content that cannot be modified by the user.",
  },
};
