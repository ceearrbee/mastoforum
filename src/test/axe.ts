import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Run axe-core against a rendered container and fail with a readable report on
 * any violation. Two rule classes are disabled here because they don't apply to
 * isolated component renders in jsdom:
 *   - `color-contrast` needs real layout/paint (covered by the browser pass);
 *   - whole-page structure rules (landmarks, single main, top-level h1) are a
 *     property of full pages, not the fragments this unit suite mounts.
 */
export async function expectNoA11yViolations(container: Element): Promise<void> {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
      'landmark-one-main': { enabled: false },
      'page-has-heading-one': { enabled: false },
    },
  });
  const report = results.violations
    .map(
      (v) =>
        `• ${v.id} (${v.impact}): ${v.help}\n    ${v.nodes
          .map((n) => n.target.join(' '))
          .join('\n    ')}\n    ${v.helpUrl}`,
    )
    .join('\n\n');
  expect(results.violations, `Accessibility violations:\n\n${report}`).toHaveLength(0);
}
