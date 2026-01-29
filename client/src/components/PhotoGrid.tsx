import { ImageInfo } from '../api/client';
import PhotoCard from './PhotoCard';

interface PhotoGridProps {
  images: ImageInfo[];
  onPhotoClick: (index: number) => void;
}

export default function PhotoGrid({ images, onPhotoClick }: PhotoGridProps) {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 p-4">
      {images.map((image, index) => (
        <PhotoCard
          key={image.path}
          image={image}
          onClick={() => onPhotoClick(index)}
        />
      ))}
    </div>
  );
}
