declare module 'react-katex' {
  import { FC } from 'react';

  export interface BlockMathProps {
    math: string;
  }

  export const BlockMath: FC<BlockMathProps>;
} 