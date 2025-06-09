import { createSystem, defineConfig, defaultConfig } from "@chakra-ui/react"

const config = defineConfig({
  // cssVarsRoot: ":root",
  // cssVarsPrefix: "chakra",
  // theme: {
  //   tokens: {
  //     colors: {
  //       gray: {
  //         50: { value: "#fafafa" },
  //         100: { value: "#f4f4f5" },
  //         200: { value: "#e4e4e7" },
  //         300: { value: "#d4d4d8" },
  //         400: { value: "#a1a1aa" },
  //         500: { value: "#71717a" },
  //         600: { value: "#52525b" },
  //         700: { value: "#3f3f46" },
  //         800: { value: "#27272a" },
  //         900: { value: "#18181b" },
  //         950: { value: "#09090b" }
  //       },
  //       blue: {
  //         50: { value: "#e6f2ff" },
  //         100: { value: "#e6f2ff" },
  //         200: { value: "#bfdeff" },
  //         300: { value: "#99caff" },
  //         400: { value: "#66b3ff" },
  //         500: { value: "#3399ff" },
  //         600: { value: "#0080ff" },
  //         700: { value: "#0066cc" },
  //         800: { value: "#004d99" },
  //         900: { value: "#003366" },
  //         950: { value: "#001a33" }
  //       }
  //     },
  //     fonts: {
  //       heading: { value: 'system-ui, sans-serif' },
  //       body: { value: 'system-ui, sans-serif' }
  //     }
  //   },
  //   semanticTokens: {
  //     colors: {
  //       bg: {
  //         value: { base: "{colors.gray.50}", _dark: "{colors.gray.900}" }
  //       },
  //       text: {
  //         value: { base: "{colors.gray.900}", _dark: "{colors.gray.50}" }
  //       },
  //       border: {
  //         value: { base: "{colors.gray.200}", _dark: "{colors.gray.700}" }
  //       }
  //     }
  //   }
  // },
  // conditions: {
  //   _dark: "@media (prefers-color-scheme: dark)"
  // },
  // globalCss: {
  //   "*, *::before, *::after": {
  //     boxSizing: "border-box",
  //     margin: 0,
  //     padding: 0
  //   },
  //   html: {
  //     fontSize: "16px",
  //     lineHeight: 1.5
  //   },
  //   body: {
  //     bg: "bg",
  //     color: "text",
  //     minHeight: "100vh"
  //   }
  // }
})

export const system = createSystem(defaultConfig, config) 