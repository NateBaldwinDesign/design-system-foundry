declare module 'react-latex' {
  import { ComponentType } from 'react';

  interface LatexProps {
    children: string;
  }

  const Latex: ComponentType<LatexProps>;
  export default Latex;
} 