import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordGate from './PasswordGate';

vi.mock('../api/client', () => ({
  unlockAlbum: vi.fn(),
}));

import { unlockAlbum } from '../api/client';
const mockUnlockAlbum = vi.mocked(unlockAlbum);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PasswordGate', () => {
  const defaultProps = {
    albumPath: 'albums/private',
    albumName: 'Private Album',
    onUnlock: vi.fn(),
  };

  it('renders the album name and password prompt', () => {
    render(<PasswordGate {...defaultProps} />);
    expect(screen.getByText('Private Album')).toBeInTheDocument();
    expect(screen.getByText('This album is password protected')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
  });

  it('disables submit button when password is empty', () => {
    render(<PasswordGate {...defaultProps} />);
    const button = screen.getByRole('button', { name: /unlock/i });
    expect(button).toBeDisabled();
  });

  it('enables submit button when password is entered', async () => {
    const user = userEvent.setup();
    render(<PasswordGate {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('Enter password'), 'secret');
    const button = screen.getByRole('button', { name: /unlock/i });
    expect(button).toBeEnabled();
  });

  it('calls unlockAlbum and onUnlock on successful submit', async () => {
    const user = userEvent.setup();
    mockUnlockAlbum.mockResolvedValue({ success: true });

    render(<PasswordGate {...defaultProps} />);
    await user.type(screen.getByPlaceholderText('Enter password'), 'correct');
    await user.click(screen.getByRole('button', { name: /unlock/i }));

    expect(mockUnlockAlbum).toHaveBeenCalledWith('albums/private', 'correct');
    expect(defaultProps.onUnlock).toHaveBeenCalled();
  });

  it('shows error message on failed unlock', async () => {
    const user = userEvent.setup();
    mockUnlockAlbum.mockResolvedValue({ success: false, error: 'Wrong password' });

    render(<PasswordGate {...defaultProps} />);
    await user.type(screen.getByPlaceholderText('Enter password'), 'wrong');
    await user.click(screen.getByRole('button', { name: /unlock/i }));

    expect(await screen.findByText('Wrong password')).toBeInTheDocument();
    expect(defaultProps.onUnlock).not.toHaveBeenCalled();
  });

  it('shows default error when no error message returned', async () => {
    const user = userEvent.setup();
    mockUnlockAlbum.mockResolvedValue({ success: false });

    render(<PasswordGate {...defaultProps} />);
    await user.type(screen.getByPlaceholderText('Enter password'), 'wrong');
    await user.click(screen.getByRole('button', { name: /unlock/i }));

    expect(await screen.findByText('Incorrect password')).toBeInTheDocument();
  });
});
