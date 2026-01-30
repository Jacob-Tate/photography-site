import { useState, useCallback, useEffect } from 'react';
import { ImageInfo } from '../api/client';

export function useLightbox(images: ImageInfo[]) {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  const open = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const close = useCallback(() => {
    setCurrentIndex(null);
  }, []);

  const next = useCallback(() => {
    if (currentIndex !== null && currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, images.length]);

  const prev = useCallback(() => {
    if (currentIndex !== null && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const navigateTo = useCallback((index: number) => {
    if (index >= 0 && index < images.length) {
      setCurrentIndex(index);
    }
  }, [images.length]);

  useEffect(() => {
    if (currentIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, close, next, prev]);

  return {
    currentIndex,
    currentImage: currentIndex !== null ? images[currentIndex] : null,
    isOpen: currentIndex !== null,
    open,
    close,
    next,
    prev,
    navigateTo,
    hasNext: currentIndex !== null && currentIndex < images.length - 1,
    hasPrev: currentIndex !== null && currentIndex > 0,
  };
}
