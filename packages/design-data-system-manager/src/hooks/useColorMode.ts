import { useTheme } from 'next-themes';

export const useColorMode = () => {
  const { resolvedTheme: colorMode } = useTheme();
  return { colorMode };
}; 