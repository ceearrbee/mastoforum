import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import ThreadRoute from './ThreadRoute';

// Stand-in for Thread: holds local state like its replyTo / reply draft.
vi.mock('./Thread', () => ({
  default: function ThreadStub() {
    const { id } = useParams();
    const [draft, setDraft] = useState('');
    return (
      <div>
        <span data-testid="thread-id">{id}</span>
        <input aria-label="draft" value={draft} onChange={(e) => setDraft(e.target.value)} />
      </div>
    );
  },
}));

describe('ThreadRoute', () => {
  it('remounts Thread when the thread id changes so reply state does not carry over', () => {
    render(
      <MemoryRouter initialEntries={['/thread/A']}>
        <Link to="/thread/B">go-b</Link>
        <Routes>
          <Route path="/thread/:id" element={<ThreadRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('draft'), { target: { value: 'text for A' } });
    expect(screen.getByLabelText('draft')).toHaveValue('text for A');

    fireEvent.click(screen.getByText('go-b'));

    expect(screen.getByTestId('thread-id')).toHaveTextContent('B');
    expect(screen.getByLabelText('draft')).toHaveValue('');
  });
});
