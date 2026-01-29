import { useState, useEffect } from 'react';
import { ImageInfo, fetchPortfolio, fetchAlbumDetail, AlbumDetail, GroupDetail } from '../api/client';

export function usePortfolio() {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPortfolio()
      .then(data => setImages(data.images))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { images, loading, error };
}

export function useAlbum(path: string) {
  const [data, setData] = useState<AlbumDetail | GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAlbumDetail(path)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [path]);

  const refetch = () => {
    setLoading(true);
    fetchAlbumDetail(path)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  return { data, loading, error, refetch };
}
