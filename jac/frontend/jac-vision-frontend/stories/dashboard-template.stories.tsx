import type { Meta, StoryObj } from "@storybook/react"
import { DashboardTemplate } from "../ds/templates/dashboard-template";

const meta: Meta<typeof DashboardTemplate> = {
  title: "Templates/DashboardTemplate",
  component: DashboardTemplate,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof DashboardTemplate>

export const Default: Story = {
  args: {
    header: <div className="h-16 flex items-center px-6 bg-primary text-primary-foreground">Header Content</div>,
    sidebar: (
      <div className="space-y-4">
        <h3 className="font-medium">Navigation</h3>
        <ul className="space-y-2">
          <li className="px-2 py-1 rounded bg-primary/10">Dashboard</li>
          <li className="px-2 py-1 rounded hover:bg-primary/5">Tasks</li>
          <li className="px-2 py-1 rounded hover:bg-primary/5">Projects</li>
          <li className="px-2 py-1 rounded hover:bg-primary/5">Settings</li>
        </ul>
      </div>
    ),
    children: (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-6 bg-card rounded-lg border shadow-sm">
              Card {i + 1}
            </div>
          ))}
        </div>
      </div>
    ),
  },
}

export const WithoutSidebar: Story = {
  args: {
    header: <div className="h-16 flex items-center px-6 bg-primary text-primary-foreground">Header Content</div>,
    children: (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-6 bg-card rounded-lg border shadow-sm">
              Card {i + 1}
            </div>
          ))}
        </div>
      </div>
    ),
  },
}

