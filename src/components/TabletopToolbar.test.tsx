import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Editor } from 'codemirror';
import TabletopToolbar, { type WritingMode } from './TabletopToolbar';

/** Minimal stand-in for the CodeMirror doc the toolbar writes through. */
function fakeEditor() {
  const inserted: string[] = [];
  const cm = {
    getDoc: () => ({
      getCursor: () => ({ line: 0, ch: 0 }),
      getLine: () => '',
      replaceRange: (text: string) => inserted.push(text),
    }),
    focus: vi.fn(),
  } as unknown as Editor;
  return { cm, inserted };
}

function renderToolbar(mode: WritingMode = 'table', onSetSpoilerText?: (text: string) => void) {
  const editor = fakeEditor();
  const onModeChange = vi.fn();
  render(
    <TabletopToolbar
      cm={editor.cm}
      mode={mode}
      onModeChange={onModeChange}
      onSetSpoilerText={onSetSpoilerText}
    />,
  );
  return { ...editor, onModeChange };
}

const openTool = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  localStorage.clear();
});

describe('writing mode', () => {
  it('hides the mechanics tools in prose mode', () => {
    renderToolbar('prose');
    expect(screen.queryByRole('toolbar', { name: /tabletop tools/i })).toBeNull();
  });

  it('shows them in table mode', () => {
    renderToolbar('table');
    expect(screen.getByRole('toolbar', { name: /tabletop tools/i })).toBeInTheDocument();
  });

  it('reports a mode change rather than owning it', () => {
    const { onModeChange } = renderToolbar('prose');
    fireEvent.click(screen.getByRole('button', { name: 'Table' }));
    expect(onModeChange).toHaveBeenCalledWith('table');
  });
});

describe('dice tool', () => {
  it('inserts a rolled line in the plain-text wire format', () => {
    const { inserted } = renderToolbar();
    openTool(/^dice$/i);
    fireEvent.change(screen.getByLabelText(/notation/i), { target: { value: '2d6+3' } });
    fireEvent.click(screen.getByRole('button', { name: /roll & insert/i }));

    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatch(/^🎲 2d6\+3 ⇒ \[\d+, \d+\] \+3 = \d+\n$/);
  });

  it('refuses to roll notation it cannot parse', () => {
    const { inserted } = renderToolbar();
    openTool(/^dice$/i);
    fireEvent.change(screen.getByLabelText(/notation/i), { target: { value: 'sideways' } });
    expect(screen.getByRole('button', { name: /roll & insert/i })).toBeDisabled();
    expect(inserted).toHaveLength(0);
  });

  it('fills the notation from a quick chip', () => {
    renderToolbar();
    openTool(/^dice$/i);
    fireEvent.click(screen.getByRole('button', { name: '4d6kh3' }));
    expect(screen.getByLabelText(/notation/i)).toHaveValue('4d6kh3');
  });
});

describe('speech tool', () => {
  it('inserts the speech convention and remembers the speaker', () => {
    const { inserted } = renderToolbar();
    openTool(/^speech$/i);
    fireEvent.change(screen.getByLabelText(/character/i), { target: { value: 'Grond' } });
    fireEvent.change(screen.getByLabelText(/says/i), { target: { value: 'We go left.' } });
    fireEvent.click(screen.getByRole('button', { name: /^insert$/i }));

    expect(inserted[0]).toBe('Grond: "We go left."\n');
    expect(screen.getByRole('button', { name: 'Grond' })).toBeInTheDocument();
  });

  it('calls onSetSpoilerText with character name', () => {
    const onSetSpoilerText = vi.fn();
    renderToolbar('table', onSetSpoilerText);
    openTool(/^speech$/i);
    fireEvent.change(screen.getByLabelText(/character/i), { target: { value: 'Grond' } });
    fireEvent.click(screen.getByRole('button', { name: /set character cw/i }));
    expect(onSetSpoilerText).toHaveBeenCalledWith('[Grond]');
  });
});

describe('ooc tool', () => {
  it('inserts the double-paren aside', () => {
    const { inserted } = renderToolbar();
    openTool(/^ooc$/i);
    fireEvent.change(screen.getByLabelText(/out of character/i), {
      target: { value: 'I have darkvision' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^insert$/i }));
    expect(inserted[0]).toBe('((ooc: I have darkvision))\n');
  });
});

describe('sheet tool', () => {
  it('needs a name before it will insert', () => {
    renderToolbar();
    openTool(/^sheet$/i);
    expect(screen.getByRole('button', { name: /^insert$/i })).toBeDisabled();
  });

  it('inserts a stat block with computed modifiers', () => {
    const { inserted } = renderToolbar();
    openTool(/^sheet$/i);
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Grond' } });
    fireEvent.change(screen.getByLabelText(/^str$/i), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: /^insert$/i }));
    expect(inserted[0]).toBe('▣ Grond\nSTR 18 (+4)\n');
  });

  it('calls onSetSpoilerText with sheet name', () => {
    const onSetSpoilerText = vi.fn();
    renderToolbar('table', onSetSpoilerText);
    openTool(/^sheet$/i);
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Grond' } });
    fireEvent.click(screen.getByRole('button', { name: /set character cw/i }));
    expect(onSetSpoilerText).toHaveBeenCalledWith('[Grond]');
  });
});

describe('whisper tool', () => {
  it('inserts the whisper convention with target and secret message', () => {
    const { inserted } = renderToolbar();
    openTool(/^whisper$/i);
    fireEvent.change(screen.getByLabelText(/whisper to/i), { target: { value: 'GM' } });
    fireEvent.change(screen.getByLabelText(/secret message/i), {
      target: { value: 'I search the chest' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^insert$/i }));
    expect(inserted[0]).toBe('((whisper to GM: I search the chest))\n');
  });

  it('disables insert when message is empty', () => {
    renderToolbar();
    openTool(/^whisper$/i);
    expect(screen.getByRole('button', { name: /^insert$/i })).toBeDisabled();
  });
});
