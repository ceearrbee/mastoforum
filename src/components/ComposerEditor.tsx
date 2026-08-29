import { lazy, Suspense, useMemo, useState } from 'react';
import { InlineLoading } from '@carbon/react';
import type { Editor } from 'codemirror';
import { useSettings } from '../context/SettingsContext';
import ComposerAutocomplete from './ComposerAutocomplete';
import TabletopToolbar, { type WritingMode } from './TabletopToolbar';

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
  /** Prose/Table choice, lifted when the caller wants to persist it. */
  mode?: WritingMode;
  onModeChange?: (mode: WritingMode) => void;
}

/** Markdown editor + `@`/`#` autocomplete; owns the CodeMirror ref so callers pass only value/onChange. */
export default function ComposerEditor({
  value,
  onChange,
  placeholder = 'Write…',
  mode,
  onModeChange,
}: Props) {
  const { settings } = useSettings();
  const [cm, setCm] = useState<Editor | null>(null);
  const [localMode, setLocalMode] = useState<WritingMode>('prose');
  // Stable identity so the editor isn't re-initialised on every render.
  const options = useMemo(
    () => ({ spellChecker: false, status: false, placeholder }),
    [placeholder],
  );

  return (
    <>
      {settings.tabletopTools && (
        <TabletopToolbar
          cm={cm}
          mode={mode ?? localMode}
          onModeChange={onModeChange ?? setLocalMode}
        />
      )}
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
