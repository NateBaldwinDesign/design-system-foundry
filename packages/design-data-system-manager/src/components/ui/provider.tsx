"use client"

import React from "react"
import { ChakraProvider } from "@chakra-ui/react"
import { ThemeProvider } from "next-themes"
import { system } from "../../theme"
// import {
//   ColorModeProvider,
//   type ColorModeProviderProps,
// } from "./color-mode"

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={system}>
      {/* <ColorModeProvider> */}
        {/* <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange> */}
          {children}
        {/* </ThemeProvider> */}
      {/* </ColorModeProvider> */}
    </ChakraProvider>
  )
}
