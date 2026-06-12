import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Page-specific styling for the heading. */
  className?: string;
}

/**
 * The single page-level `<h1>`. The header brand is no longer a heading, so each
 * routed view — including signed-out fallbacks — renders exactly one of these to
 * keep a valid heading hierarchy (page `h1` → section `h2` → row `h3`).
 */
export default function PageHeading({ children, className }: Props) {
  return <h1 className={className}>{children}</h1>;
}
