/**
 * Recognise the plain-text tabletop conventions in an already-sanitized status
 * body and wrap them in styling hooks.
 *
 * This runs *after* DOMPurify and uses DOM APIs only — `createElement`,
 * `textContent`, node moves. No markup is ever built from a string here, so a
 * crafted post cannot smuggle anything past the sanitizer through this pass.
 * The only tags introduced are `<span>`s carrying fixed class names, which the
 * existing `STATUS_HTML_CONFIG` allow-list already permits.
 */

const LINE_BREAK = 'BR';
/** Elements that hold a run of `<br>`-separated lines. */
const LINE_CONTAINERS = 'p, blockquote, li';
/** Wrappers we've already made — never reprocess their contents. */
const WRAPPED = 'span.tt-dice, span.tt-speech, span.tt-ooc, span.tt-sheet';

const DICE = /^\s*🎲\s+\S.*=\s*-?\d+\s*$/;
const SPEECH = /^\s*([^\s:][^:\n]{0,31}?)\s*:\s+"([^"]{1,400})"\s*$/;
const SHEET_HEAD = /^\s*▣\s*\S/;
const OOC = /\(\(\s*ooc\b[:\s]\s*([^)]{1,400}?)\s*\)\)/gi;

type LineKind = 'dice' | 'speech' | 'sheet-head' | 'blank' | 'plain';

interface Line {
  /** The nodes making up this line, excluding the `<br>` that ends it. */
  nodes: Node[];
  /** The `<br>` terminating this line, if any. */
  br: Node | null;
  text: string;
  kind: LineKind;
}

/** Speakers are names, not sentences — three words is already generous. */
function isPlausibleSpeaker(name: string): boolean {
  return name.length > 0 && name.split(/\s+/).length <= 3;
}

function classify(text: string): LineKind {
  if (!text.trim()) return 'blank';
  if (DICE.test(text)) return 'dice';
  if (SHEET_HEAD.test(text)) return 'sheet-head';
  const speech = SPEECH.exec(text);
  if (speech && isPlausibleSpeaker(speech[1])) return 'speech';
  return 'plain';
}

function splitLines(container: Node): Line[] {
  const lines: Line[] = [];
  let current: Node[] = [];

  const push = (br: Node | null) => {
    lines.push({
      nodes: current,
      br,
      text: current.map((n) => n.textContent ?? '').join(''),
      kind: 'plain',
    });
    current = [];
  };

  for (const node of Array.from(container.childNodes)) {
    if (node.nodeName === LINE_BREAK) push(node);
    else current.push(node);
  }
  if (current.length > 0) push(null);

  for (const line of lines) line.kind = classify(line.text);
  return lines;
}

function wrap(line: Line[], className: string): HTMLSpanElement | null {
  const first = line[0]?.nodes[0] ?? line[0]?.br;
  const parent = first?.parentNode;
  if (!first || !parent) return null;

  const span = document.createElement('span');
  span.className = className;
  parent.insertBefore(span, first);
  line.forEach((l, index) => {
    l.nodes.forEach((n) => span.appendChild(n));
    // Keep the separating <br>s inside the wrapper, but not the trailing one —
    // that break belongs to the paragraph, not to the block.
    if (l.br && index < line.length - 1) span.appendChild(l.br);
  });
  return span;
}

/** Split `Grond: "…"` into speaker and quote so each can be styled. */
function markSpeaker(span: HTMLSpanElement): void {
  const first = span.firstChild;
  if (!first || first.nodeType !== Node.TEXT_NODE) return;
  const text = first.textContent ?? '';
  const colon = text.indexOf(':');
  if (colon <= 0) return;

  const speaker = document.createElement('span');
  speaker.className = 'tt-speaker';
  speaker.textContent = text.slice(0, colon);
  first.textContent = text.slice(colon);
  span.insertBefore(speaker, first);
}

function enhanceContainer(container: Node): void {
  const lines = splitLines(container);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.kind === 'dice') {
      wrap([line], 'tt-dice');
      continue;
    }
    if (line.kind === 'speech') {
      const span = wrap([line], 'tt-speech');
      if (span) markSpeaker(span);
      continue;
    }
    if (line.kind === 'sheet-head') {
      // A sheet runs from its ▣ header until a blank line or the start of
      // some other construct.
      let end = i;
      while (
        end + 1 < lines.length &&
        lines[end + 1].kind === 'plain'
      ) {
        end += 1;
      }
      wrap(lines.slice(i, end + 1), 'tt-sheet');
      i = end;
    }
  }
}

/** Wrap inline `((ooc: …))` asides, splitting the text node around each match. */
function enhanceOoc(root: ParentNode): void {
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    if (text.parentElement?.closest(WRAPPED)) continue;
    OOC.lastIndex = 0;
    if (OOC.test(text.data)) targets.push(text);
  }

  for (const text of targets) {
    const parent = text.parentNode;
    if (!parent) continue;
    const frag = document.createDocumentFragment();
    let cursor = 0;
    OOC.lastIndex = 0;
    for (const match of text.data.matchAll(OOC)) {
      const start = match.index ?? 0;
      if (start > cursor) frag.appendChild(document.createTextNode(text.data.slice(cursor, start)));
      const span = document.createElement('span');
      span.className = 'tt-ooc';
      span.textContent = match[0];
      frag.appendChild(span);
      cursor = start + match[0].length;
    }
    if (cursor < text.data.length) frag.appendChild(document.createTextNode(text.data.slice(cursor)));
    parent.replaceChild(frag, text);
  }
}

/**
 * Takes DOMPurify output, returns DOMPurify output with tabletop blocks wrapped.
 * Falls back to the input untouched if anything goes wrong — a rendering nicety
 * must never be able to blank out a post.
 */
export function enhanceTabletopHtml(safeHtml: string): string {
  if (!safeHtml) return safeHtml;
  try {
    const template = document.createElement('template');
    // Already sanitized upstream, and a detached <template> is inert.
    template.innerHTML = safeHtml;

    const containers: Node[] = Array.from(
      template.content.querySelectorAll(LINE_CONTAINERS),
    );
    // A body with no block wrapper at all still has lines worth reading.
    if (containers.length === 0) containers.push(template.content);
    for (const container of containers) enhanceContainer(container);

    enhanceOoc(template.content);
    return template.innerHTML;
  } catch {
    return safeHtml;
  }
}
