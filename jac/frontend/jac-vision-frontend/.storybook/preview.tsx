import type { Preview } from "@storybook/react"
import { ThemeProvider } from "@/ds/theme-provider"
import { Provider } from "react-redux"
import { store } from "@/lib/redux/store"
import "@/app/globals.css"

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <Provider store={store}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <div className="p-4">
            <Story />
          </div>
        </ThemeProvider>
      </Provider>
    ),
  ],
}

export default preview

