import type { Meta, StoryObj } from "@storybook/react";
import { LoginForm } from "../ds/organisms/login-form";
import { rest } from "msw";
import { within, userEvent, waitFor } from "@storybook/testing-library";
import { expect } from "@storybook/jest";

const meta: Meta<typeof LoginForm> = {
  title: "Organisms/LoginForm",
  component: LoginForm,
  parameters: {
    layout: "centered",
    msw: {
      handlers: [
        rest.post("/api/auth/login", (req, res, ctx) => {
          return res(
            ctx.json({
              token: "fake-token",
              user: { id: "1", name: "Test User", email: "test@example.com" },
            })
          );
        }),
      ],
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof LoginForm>;

export const Default: Story = {};

export const Filled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Fill in the form
    await userEvent.type(canvas.getByLabelText("Email"), "test@example.com");
    await userEvent.type(canvas.getByLabelText("Password"), "password123");
  },
};

export const WithValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Fill in invalid data
    await userEvent.type(canvas.getByLabelText("Email"), "invalid-email");
    await userEvent.type(canvas.getByLabelText("Password"), "123");

    // Submit the form
    await userEvent.click(canvas.getByRole("button", { name: "Login" }));

    // Check for validation errors
    await waitFor(() => {
      expect(
        canvas.getByText("Please enter a valid email address")
      ).toBeInTheDocument();
      expect(
        canvas.getByText("Password must be at least 6 characters")
      ).toBeInTheDocument();
    });
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.post("/api/auth/login", async (req, res, ctx) => {
          // Delay the response to show loading state
          await new Promise((resolve) => setTimeout(resolve, 10000));
          return res(ctx.json({ token: "fake-token" }));
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Fill in the form
    await userEvent.type(canvas.getByLabelText("Email"), "test@example.com");
    await userEvent.type(canvas.getByLabelText("Password"), "password123");

    // Submit the form
    await userEvent.click(canvas.getByRole("button", { name: "Login" }));

    // Check for loading state
    await waitFor(() => {
      expect(canvas.getByText("Logging in...")).toBeInTheDocument();
    });
  },
};

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.post("/api/auth/login", (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({ message: "Invalid credentials" })
          );
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Fill in the form
    await userEvent.type(canvas.getByLabelText("Email"), "test@example.com");
    await userEvent.type(canvas.getByLabelText("Password"), "password123");

    // Submit the form
    await userEvent.click(canvas.getByRole("button", { name: "Login" }));

    // Check for error message
    await waitFor(() => {
      expect(
        canvas.getByText("Invalid email or password. Please try again.")
      ).toBeInTheDocument();
    });
  },
};
