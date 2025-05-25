import type { Meta, StoryObj } from "@storybook/react"
import { RegisterForm } from "../ds/organisms/register-form"
import { rest } from "msw"
import { within, userEvent, waitFor } from "@storybook/testing-library"
import { expect } from "@storybook/jest"

const meta: Meta<typeof RegisterForm> = {
  title: "Organisms/RegisterForm",
  component: RegisterForm,
  parameters: {
    layout: "centered",
    msw: {
      handlers: [
        rest.post("/api/auth/register", (req, res, ctx) => {
          return res(
            ctx.json({
              token: "fake-token",
              user: { id: "1", name: "Test User", email: "test@example.com" },
            }),
          )
        }),
      ],
    },
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof RegisterForm>

export const Default: Story = {}

export const Filled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Fill in the form
    await userEvent.type(canvas.getByLabelText("Name"), "Test User")
    await userEvent.type(canvas.getByLabelText("Email"), "test@example.com")
    await userEvent.type(canvas.getByLabelText("Password"), "password123")
    await userEvent.type(canvas.getByLabelText("Confirm Password"), "password123")
  },
}

export const WithValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Fill in invalid data
    await userEvent.type(canvas.getByLabelText("Name"), "T")
    await userEvent.type(canvas.getByLabelText("Email"), "invalid-email")
    await userEvent.type(canvas.getByLabelText("Password"), "123")
    await userEvent.type(canvas.getByLabelText("Confirm Password"), "456")

    // Submit the form\
    await userEvent.click(canvas.getByRole("button\", { name: \"Register\" })) }))
    
    // Check for validation errors
    await waitFor(() => {
      expect(canvas.getByText("Name must be at least 2 characters")).toBeInTheDocument()
      expect(canvas.getByText("Please enter a valid email address")).toBeInTheDocument()
      expect(canvas.getByText("Password must be at least 6 characters")).toBeInTheDocument()
      expect(canvas.getByText("Passwords do not match")).toBeInTheDocument()
    })
  },
}

export const PasswordMismatch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Fill in form with mismatched passwords
    await userEvent.type(canvas.getByLabelText("Name"), "Test User")
    await userEvent.type(canvas.getByLabelText("Email"), "test@example.com")
    await userEvent.type(canvas.getByLabelText("Password"), "password123")
    await userEvent.type(canvas.getByLabelText("Confirm Password"), "different123")

    // Submit the form
    await userEvent.click(canvas.getByRole("button", { name: "Register" }))

    // Check for password mismatch error
    await waitFor(() => {
      expect(canvas.getByText("Passwords do not match")).toBeInTheDocument()
    })
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.post("/api/auth/register", async (req, res, ctx) => {
          // Delay the response to show loading state
          await new Promise((resolve) => setTimeout(resolve, 10000))
          return res(ctx.json({ token: "fake-token" }))
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Fill in the form
    await userEvent.type(canvas.getByLabelText("Name"), "Test User")
    await userEvent.type(canvas.getByLabelText("Email"), "test@example.com")
    await userEvent.type(canvas.getByLabelText("Password"), "password123")
    await userEvent.type(canvas.getByLabelText("Confirm Password"), "password123")

    // Submit the form
    await userEvent.click(canvas.getByRole("button", { name: "Register" }))

    // Check for loading state
    await waitFor(() => {
      expect(canvas.getByText("Creating account...")).toBeInTheDocument()
    })
  },
}

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.post("/api/auth/register", (req, res, ctx) => {
          return res(ctx.status(400), ctx.json({ message: "Email already in use" }))
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Fill in the form
    await userEvent.type(canvas.getByLabelText("Name"), "Test User")
    await userEvent.type(canvas.getByLabelText("Email"), "test@example.com")
    await userEvent.type(canvas.getByLabelText("Password"), "password123")
    await userEvent.type(canvas.getByLabelText("Confirm Password"), "password123")

    // Submit the form
    await userEvent.click(canvas.getByRole("button", { name: "Register" }))

    // Check for error message
    await waitFor(() => {
      expect(canvas.getByText("Registration failed. This email may already be in use.")).toBeInTheDocument()
    })
  },
}

