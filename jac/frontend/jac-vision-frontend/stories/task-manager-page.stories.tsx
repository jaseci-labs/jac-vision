import type { Meta, StoryObj } from "@storybook/react";
import { TaskManagerPage } from "../modules/tasks/pages/task-manager-page";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import tasksReducer from "@/store/tasksSlice";
import { ThemeProvider } from "@/ds/theme-provider";

// Create a mock store with some sample tasks
const createMockStore = (initialTasks = []) => {
  return configureStore({
    reducer: {
      tasks: tasksReducer,
      // Add other reducers as needed
    },
    preloadedState: {
      tasks: {
        tasks: initialTasks,
        isLoading: false,
        error: null,
      },
    },
  });
};

// Sample tasks for our stories
const sampleTasks = [
  {
    id: "1",
    title: "Complete project documentation",
    description: "Write comprehensive documentation for the new feature",
    completed: false,
    priority: "medium",
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
  },
  {
    id: "2",
    title: "Fix navigation bug",
    description: "The dropdown menu doesn't close when clicking outside",
    completed: true,
    priority: "high",
    dueDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
  {
    id: "3",
    title: "Review pull requests",
    description: "Review and merge pending PRs from the team",
    completed: false,
    priority: "low",
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
  },
];

const meta: Meta<typeof TaskManagerPage> = {
  title: "Pages/TaskManagerPage",
  component: TaskManagerPage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => {
      const store = createMockStore(sampleTasks);
      return (
        <Provider store={store}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <Story />
          </ThemeProvider>
        </Provider>
      );
    },
  ],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TaskManagerPage>;

export const Default: Story = {};

export const EmptyState: Story = {
  decorators: [
    (Story) => {
      const emptyStore = createMockStore([]);
      return (
        <Provider store={emptyStore}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <Story />
          </ThemeProvider>
        </Provider>
      );
    },
  ],
};

export const DarkMode: Story = {
  decorators: [
    (Story) => {
      const store = createMockStore(sampleTasks);
      return (
        <Provider store={store}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
          >
            <Story />
          </ThemeProvider>
        </Provider>
      );
    },
  ],
};
