import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';
import { APP_CONFIG, BUILD_INFO } from '../config';

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );

describe('Footer build stamp', () => {
  it('shows the version, commit and build date', () => {
    renderFooter();
    expect(screen.getByText(`v${BUILD_INFO.version}`)).toBeInTheDocument();
    expect(screen.getByText(BUILD_INFO.commit)).toBeInTheDocument();
    expect(screen.getByText(BUILD_INFO.time.slice(0, 10))).toBeInTheDocument();
  });

  it('links the commit to the repo', () => {
    renderFooter();
    const link = screen.getByRole('link', { name: BUILD_INFO.commit });
    expect(link).toHaveAttribute(
      'href',
      `${APP_CONFIG.repoUrl}/commit/${BUILD_INFO.commit.replace('-dirty', '')}`,
    );
  });

  it('exposes the full timestamp as a machine-readable time', () => {
    const { container } = renderFooter();
    expect(container.querySelector('time')).toHaveAttribute('datetime', BUILD_INFO.time);
  });
});
