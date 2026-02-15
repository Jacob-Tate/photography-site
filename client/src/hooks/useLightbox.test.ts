import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLightbox } from './useLightbox';
import { ImageInfo } from '../api/client';

function makeImages(count: number): ImageInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    filename: `img${i}.jpg`,
    path: `portfolio/img${i}.jpg`,
    width: 1000,
    height: 800,
    thumbnailUrl: `/thumb/img${i}.jpg`,
    fullUrl: `/full/img${i}.jpg`,
    downloadUrl: `/download/img${i}.jpg`,
  }));
}

describe('useLightbox', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useLightbox(makeImages(3)));
    expect(result.current.isOpen).toBe(false);
    expect(result.current.currentIndex).toBeNull();
    expect(result.current.currentImage).toBeNull();
  });

  it('opens to a specific index', () => {
    const images = makeImages(3);
    const { result } = renderHook(() => useLightbox(images));

    act(() => result.current.open(1));
    expect(result.current.isOpen).toBe(true);
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.currentImage).toBe(images[1]);
  });

  it('navigates next and prev', () => {
    const { result } = renderHook(() => useLightbox(makeImages(3)));

    act(() => result.current.open(0));
    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrev).toBe(false);

    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.hasPrev).toBe(true);

    act(() => result.current.prev());
    expect(result.current.currentIndex).toBe(0);
  });

  it('clamps at boundaries', () => {
    const { result } = renderHook(() => useLightbox(makeImages(2)));

    act(() => result.current.open(0));
    act(() => result.current.prev());
    expect(result.current.currentIndex).toBe(0);

    act(() => result.current.open(1));
    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(1);
  });

  it('closes the lightbox', () => {
    const { result } = renderHook(() => useLightbox(makeImages(3)));

    act(() => result.current.open(0));
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.currentImage).toBeNull();
  });

  it('navigateTo jumps to arbitrary index', () => {
    const { result } = renderHook(() => useLightbox(makeImages(5)));

    act(() => result.current.open(0));
    act(() => result.current.navigateTo(3));
    expect(result.current.currentIndex).toBe(3);
  });

  it('navigateTo ignores out-of-bounds', () => {
    const { result } = renderHook(() => useLightbox(makeImages(3)));

    act(() => result.current.open(1));
    act(() => result.current.navigateTo(10));
    expect(result.current.currentIndex).toBe(1);

    act(() => result.current.navigateTo(-1));
    expect(result.current.currentIndex).toBe(1);
  });

  it('responds to keyboard events', () => {
    const { result } = renderHook(() => useLightbox(makeImages(3)));

    act(() => result.current.open(1));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(result.current.currentIndex).toBe(2);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    expect(result.current.currentIndex).toBe(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.isOpen).toBe(false);
  });
});
