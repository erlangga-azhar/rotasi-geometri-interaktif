import { useMemo } from 'react';
import katex from 'katex';

interface TexProps {
  tex: string;
  block?: boolean;
  className?: string;
}

function Tex({ tex, block = false, className = '' }: TexProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        throwOnError: false,
        displayMode: block,
        output: 'html',
        strict: false,
      });
    } catch {
      return tex;
    }
  }, [tex, block]);

  return (
    <div
      className={`${block ? 'overflow-x-auto scrollbar-thin py-1' : 'inline-block'} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default Tex;
