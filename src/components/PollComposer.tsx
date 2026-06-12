import { Button, Select, SelectItem, TextInput, Toggle } from '@carbon/react';
import { Add, Close } from '@carbon/icons-react';
import { getPollConfig } from '../utils/instanceConfig';
import { canAddOption, canRemoveOption, MIN_POLL_OPTIONS } from '../utils/poll';
import styles from './PollComposer.module.css';

export interface PollDraft {
  options: string[];
  /** Duration in seconds. */
  expiresIn: number;
  multiple: boolean;
  hideTotals: boolean;
}

const DURATIONS: Array<{ label: string; value: number }> = [
  { label: '5 minutes', value: 300 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
  { label: '6 hours', value: 21600 },
  { label: '1 day', value: 86400 },
  { label: '3 days', value: 259200 },
  { label: '7 days', value: 604800 },
];

const emptyPollDraft = (): PollDraft => ({
  options: ['', ''],
  expiresIn: 86400,
  multiple: false,
  hideTotals: false,
});

interface Props {
  value: PollDraft | null;
  onChange: (draft: PollDraft | null) => void;
  disabled?: boolean;
}

/** Poll creation UI: a "Convert to poll" affordance when `value` is null, the editing panel otherwise. */
export default function PollComposer({ value, onChange, disabled }: Props) {
  const { maxOptions, maxCharactersPerOption } = getPollConfig();

  if (!value) {
    return (
      <Button
        kind="ghost"
        size="sm"
        renderIcon={Add}
        disabled={disabled}
        onClick={() => onChange(emptyPollDraft())}
      >
        Convert to poll
      </Button>
    );
  }

  const update = (patch: Partial<PollDraft>) => {
    onChange({ ...value, ...patch });
  };

  const setOption = (idx: number, text: string) =>
    update({ options: value.options.map((o, i) => (i === idx ? text : o)) });

  const addOption = () => {
    update({ options: [...value.options, ''] });
  };

  const removeOption = (idx: number) =>
    update({ options: value.options.filter((_, i) => i !== idx) });

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>Poll</span>
        <Button kind="ghost" size="sm" renderIcon={Close} onClick={() => onChange(null)}>
          Remove poll
        </Button>
      </div>

      <ul className={styles.options}>
        {value.options.map((option, idx) => (
          <li key={idx} className={styles.option}>
            <TextInput
              id={`poll-option-${idx}`}
              labelText={`Option ${idx + 1}`}
              hideLabel
              placeholder={`Choice ${idx + 1}`}
              value={option}
              maxLength={maxCharactersPerOption}
              onChange={(e) => setOption(idx, e.target.value)}
              disabled={disabled}
            />
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              iconDescription="Remove option"
              renderIcon={Close}
              disabled={disabled || !canRemoveOption(value.options)}
              onClick={() => removeOption(idx)}
            />
          </li>
        ))}
      </ul>

      <Button
        kind="ghost"
        size="sm"
        renderIcon={Add}
        disabled={disabled || !canAddOption(value.options, maxOptions)}
        onClick={addOption}
      >
        Add option (max {maxOptions})
      </Button>

      <Select
        id="poll-duration"
        labelText="Poll length"
        value={String(value.expiresIn)}
        onChange={(e) => update({ expiresIn: Number(e.target.value) })}
        disabled={disabled}
      >
        {DURATIONS.map((d) => (
          <SelectItem key={d.value} value={String(d.value)} text={d.label} />
        ))}
      </Select>

      <div className={styles.toggles}>
        <Toggle
          id="poll-multiple"
          size="sm"
          labelText="Allow multiple choices"
          toggled={value.multiple}
          onToggle={(checked) => update({ multiple: checked })}
          disabled={disabled}
        />
        <Toggle
          id="poll-hide-totals"
          size="sm"
          labelText="Hide totals until the poll ends"
          toggled={value.hideTotals}
          onToggle={(checked) => update({ hideTotals: checked })}
          disabled={disabled}
        />
      </div>

      <p className={styles.hint}>A poll needs at least {MIN_POLL_OPTIONS} filled options.</p>
    </div>
  );
}
