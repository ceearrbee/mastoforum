import { useMemo, useState } from 'react';
import { Button, TextInput } from '@carbon/react';
import { Catalog, Chat, Cube, Idea } from '@carbon/icons-react';
import type { Editor } from 'codemirror';
import { PillGroup } from './SortPills';
import {
  ABILITIES,
  formatOoc,
  formatSheet,
  formatSpeech,
  type Ability,
  type CharacterSheet,
} from '../utils/ttrpg/format';
import { formatRoll, parseDice, rollDice } from '../utils/ttrpg/dice';
import { getSpeakers, rememberSpeaker } from '../utils/ttrpg/speakers';
import styles from './TabletopToolbar.module.css';

export type WritingMode = 'prose' | 'table';

const MODES: { key: WritingMode; label: string }[] = [
  { key: 'prose', label: 'Prose' },
  { key: 'table', label: 'Table' },
];

const QUICK_ROLLS = ['d20', 'adv d20', 'dis d20', '2d6', '4d6kh3', '1d8+3'];

type Tool = 'dice' | 'speech' | 'ooc' | 'sheet';

const emptySheet: CharacterSheet = {
  name: '',
  descriptor: '',
  hp: '',
  ac: '',
  speed: '',
  abilities: {},
  notes: '',
};

interface Props {
  /** The CodeMirror 5 instance behind the EasyMDE editor, once available. */
  cm: Editor | null;
  mode: WritingMode;
  onModeChange: (mode: WritingMode) => void;
}

/**
 * Inserts the plain-text tabletop conventions at the cursor. Everything it
 * writes is ordinary text that reads correctly in any client — the styling
 * MastoForum adds on render is a bonus, never the meaning.
 */
export default function TabletopToolbar({ cm, mode, onModeChange }: Props) {
  const [tool, setTool] = useState<Tool | null>(null);
  const [notation, setNotation] = useState('d20');
  const [speaker, setSpeaker] = useState('');
  const [line, setLine] = useState('');
  const [ooc, setOoc] = useState('');
  const [sheet, setSheet] = useState<CharacterSheet>(emptySheet);
  const [speakers, setSpeakers] = useState<string[]>(() => getSpeakers());

  const spec = useMemo(() => parseDice(notation), [notation]);
  const sheetText = useMemo(() => formatSheet(sheet), [sheet]);

  const insert = (text: string) => {
    if (!cm || !text) return;
    const doc = cm.getDoc();
    const cursor = doc.getCursor();
    // Start on a fresh line so the block never runs into what's already typed.
    const before = (doc.getLine(cursor.line) ?? '').slice(0, cursor.ch);
    doc.replaceRange(`${before.trim() ? '\n' : ''}${text}\n`, cursor);
    cm.focus();
  };

  const toggleTool = (next: Tool) => setTool((current) => (current === next ? null : next));

  const insertRoll = () => {
    if (!spec) return;
    insert(formatRoll(rollDice(spec)));
  };

  const insertSpeech = () => {
    const text = formatSpeech(speaker, line);
    if (!text) return;
    insert(text);
    setSpeakers(rememberSpeaker(speaker));
    setLine('');
  };

  const insertOoc = () => {
    const text = formatOoc(ooc);
    if (!text) return;
    insert(text);
    setOoc('');
  };

  const insertSheet = () => {
    if (!sheetText) return;
    insert(sheetText);
  };

  const setAbility = (key: Ability, value: string) =>
    setSheet((prev) => ({ ...prev, abilities: { ...prev.abilities, [key]: value } }));

  return (
    <div className={styles.bar}>
      <div className={styles.modeRow}>
        <PillGroup options={MODES} value={mode} onChange={onModeChange} label="Composer mode" />
        <span className={styles.modeHint}>
          {mode === 'prose'
            ? 'Clean writing surface — no mechanics.'
            : 'Dice, speech and sheets, inserted as plain text.'}
        </span>
      </div>

      {mode === 'table' && (
        <div className={styles.tools} role="toolbar" aria-label="Tabletop tools">
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Cube}
            aria-pressed={tool === 'dice'}
            onClick={() => toggleTool('dice')}
          >
            Dice
          </Button>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Chat}
            aria-pressed={tool === 'speech'}
            onClick={() => toggleTool('speech')}
          >
            Speech
          </Button>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Idea}
            aria-pressed={tool === 'ooc'}
            onClick={() => toggleTool('ooc')}
          >
            OOC
          </Button>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Catalog}
            aria-pressed={tool === 'sheet'}
            onClick={() => toggleTool('sheet')}
          >
            Sheet
          </Button>
        </div>
      )}

      {mode === 'table' && tool === 'dice' && (
        <div className={styles.panel}>
          <div className={styles.chips}>
            {QUICK_ROLLS.map((quick) => (
              <button
                key={quick}
                type="button"
                className={styles.chip}
                onClick={() => setNotation(quick)}
              >
                {quick}
              </button>
            ))}
          </div>
          <TextInput
            id="tt-notation"
            labelText="Notation"
            helperText="2d6+3 · 4d6kh3 · adv d20+7 · 1d8+1d6"
            value={notation}
            invalid={notation.trim().length > 0 && !spec}
            invalidText="Not dice notation we can roll."
            onChange={(e) => setNotation(e.target.value)}
          />
          <p className={styles.preview}>
            {spec
              ? formatRoll(rollDice(spec, (sides) => sides)).replace(/= \d+$/, '= …')
              : 'Enter notation to see the shape of the line.'}
          </p>
          <div className={styles.actions}>
            <Button size="sm" disabled={!spec || !cm} onClick={insertRoll}>
              Roll &amp; insert
            </Button>
          </div>
        </div>
      )}

      {mode === 'table' && tool === 'speech' && (
        <div className={styles.panel}>
          {speakers.length > 0 && (
            <div className={styles.chips}>
              {speakers.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={styles.chip}
                  onClick={() => setSpeaker(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          <div className={styles.row}>
            <TextInput
              id="tt-speaker"
              labelText="Character"
              placeholder="Grond"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
            />
            <TextInput
              id="tt-line"
              labelText="Says"
              placeholder="We go left."
              value={line}
              onChange={(e) => setLine(e.target.value)}
            />
          </div>
          <p className={styles.preview}>
            {formatSpeech(speaker, line) || 'Grond: "We go left."'}
          </p>
          <div className={styles.actions}>
            <Button size="sm" disabled={!formatSpeech(speaker, line) || !cm} onClick={insertSpeech}>
              Insert
            </Button>
          </div>
        </div>
      )}

      {mode === 'table' && tool === 'ooc' && (
        <div className={styles.panel}>
          <TextInput
            id="tt-ooc"
            labelText="Out of character"
            placeholder="I have darkvision, so I'll scout"
            value={ooc}
            onChange={(e) => setOoc(e.target.value)}
          />
          <p className={styles.preview}>{formatOoc(ooc) || '((ooc: …))'}</p>
          <div className={styles.actions}>
            <Button size="sm" disabled={!formatOoc(ooc) || !cm} onClick={insertOoc}>
              Insert
            </Button>
          </div>
        </div>
      )}

      {mode === 'table' && tool === 'sheet' && (
        <div className={styles.panel}>
          <div className={styles.row}>
            <TextInput
              id="tt-sheet-name"
              labelText="Name"
              placeholder="Grond"
              value={sheet.name}
              onChange={(e) => setSheet((prev) => ({ ...prev, name: e.target.value }))}
            />
            <TextInput
              id="tt-sheet-descriptor"
              labelText="Ancestry / class / level"
              placeholder="Half-Orc Barbarian 3"
              value={sheet.descriptor}
              onChange={(e) => setSheet((prev) => ({ ...prev, descriptor: e.target.value }))}
            />
          </div>
          <div className={styles.row}>
            <TextInput
              id="tt-sheet-hp"
              labelText="HP"
              placeholder="34/34"
              value={sheet.hp}
              onChange={(e) => setSheet((prev) => ({ ...prev, hp: e.target.value }))}
            />
            <TextInput
              id="tt-sheet-ac"
              labelText="AC"
              placeholder="16"
              value={sheet.ac}
              onChange={(e) => setSheet((prev) => ({ ...prev, ac: e.target.value }))}
            />
            <TextInput
              id="tt-sheet-speed"
              labelText="Speed"
              placeholder="30"
              value={sheet.speed}
              onChange={(e) => setSheet((prev) => ({ ...prev, speed: e.target.value }))}
            />
          </div>
          <div className={styles.row}>
            {ABILITIES.map((key) => (
              <TextInput
                key={key}
                id={`tt-sheet-${key.toLowerCase()}`}
                labelText={key}
                placeholder="10"
                value={sheet.abilities[key] ?? ''}
                onChange={(e) => setAbility(key, e.target.value)}
              />
            ))}
          </div>
          <TextInput
            id="tt-sheet-notes"
            labelText="Notes (optional)"
            placeholder="Rage 3/day · Great Axe +7 (1d12+4)"
            value={sheet.notes}
            onChange={(e) => setSheet((prev) => ({ ...prev, notes: e.target.value }))}
          />
          <p className={styles.preview}>
            {sheetText || 'A name is enough to start a sheet.'}
          </p>
          <div className={styles.actions}>
            <span className={styles.modeHint}>{sheetText.length} characters</span>
            <Button size="sm" disabled={!sheetText || !cm} onClick={insertSheet}>
              Insert
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
