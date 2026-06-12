import { lazy, Suspense, useMemo, useState } from 'react';
import { InlineLoading } from '@carbon/react';
import type { Editor } from 'codemirror';
import ComposerAutocomplete from './ComposerAutocomplete';

// Loading the markdown editor (and its CSS) is deferred so it doesn't weigh
// down the initial bundle. Shared by the reply editor and the topic/edit modal.
const SimpleMdeReact = lazy(async () => {
  await import('easymde/dist/easymde.min.css');
  return import('react-simplemde-editor');
});

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Markdown editor + `@`/`#` autocomplete; owns the CodeMirror ref so callers pass only value/onChange. */
export default function ComposerEditor({ value, onChange, placeholder = 'Write…' }: Props) {
  const [cm, setCm] = useState<Editor | null>(null);
  // Stable identity so the editor isn't re-initialised on every render.
  const options = useMemo(
    () => ({ spellChecker: false, status: false, placeholder }),
    [placeholder],
  );

  return (
    <>
      <Suspense fallback={<InlineLoading description="Loading editor…" />}>
        <SimpleMdeReact
          value={value}
          onChange={onChange}
          options={options}
          getCodemirrorInstance={setCm}
        />
      </Suspense>
      <ComposerAutocomplete cm={cm} />
    </>
  );
}
