/* eslint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-to-interactive-role */
/*
 * Implements the W3C ARIA "listbox" autocomplete pattern: list/options are roles
 * on <ul>/<li> rather than native <select>/<option>, which can't render the rich
 * rows or work as a free-floating overlay. The roles are intentional here.
 */
import styles from './ComposerAutocomplete.module.css';

export interface TagSuggestion {
  name: string;
  following: boolean;
}

interface Props {
  tags: TagSuggestion[];
  selected: number;
  onPick: (index: number) => void;
  /** When set, wires ARIA combobox ids (listbox + per-option) for the header. */
  listboxId?: string;
  optionId?: (index: number) => string;
}

/** Result rows for the `#`-autocomplete popover (composer and header search). */
export default function TagPicker({ tags, selected, onPick, listboxId, optionId }: Props) {
  return (
    <ul className={styles.list} role="listbox" id={listboxId} aria-label="Hashtag suggestions">
      {tags.map((tag, idx) => (
        <li
          key={tag.name}
          id={optionId?.(idx)}
          role="option"
          aria-selected={idx === selected}
          className={`${styles.row} ${idx === selected ? styles.active : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(idx);
          }}
        >
          <span className={styles.rowText}>
            <span className={styles.rowName}>#{tag.name}</span>
            {tag.following && <span className={styles.rowMeta}>following</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
