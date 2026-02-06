import { useMemo } from 'react';
import { ImageInfo } from '../api/client';
import PhotoGrid from './PhotoGrid';
import { groupImagesByDay } from '../utils/tripDays';

interface TripDaysGridProps {
  images: ImageInfo[];
  onPhotoClick: (index: number) => void;
  lightboxOpen: boolean;
}

/**
 * Displays photos grouped by day with day headers.
 * Used when an album has trip_days.txt enabled.
 */
export default function TripDaysGrid({ images, onPhotoClick, lightboxOpen }: TripDaysGridProps) {
  const dayGroups = useMemo(() => groupImagesByDay(images), [images]);

  // Calculate the starting index for each day group
  const groupStartIndices = useMemo(() => {
    const indices: number[] = [];
    let currentIndex = 0;
    for (const group of dayGroups) {
      indices.push(currentIndex);
      currentIndex += group.images.length;
    }
    return indices;
  }, [dayGroups]);

  const handlePhotoClick = (groupIndex: number, photoIndexInGroup: number) => {
    const globalIndex = groupStartIndices[groupIndex] + photoIndexInGroup;
    onPhotoClick(globalIndex);
  };

  if (dayGroups.length === 0) {
    return (
      <div className="text-center text-neutral-400 py-12">
        No photos found
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {dayGroups.map((group, groupIndex) => (
        <div key={group.dateKey}>
          {/* Day Header */}
          <div className="mb-4 pb-2 border-b border-neutral-800">
            <h2 className="text-lg font-medium text-white flex items-center gap-3">
              <span className="bg-neutral-800 text-neutral-300 px-2.5 py-0.5 rounded-full text-sm">
                Day {group.dayNumber}
              </span>
              <span className="text-neutral-400">{group.dateLabel}</span>
              <span className="text-neutral-600 text-sm">
                ({group.images.length} {group.images.length === 1 ? 'photo' : 'photos'})
              </span>
            </h2>
          </div>

          {/* Photos for this day */}
          <PhotoGrid
            images={group.images}
            onPhotoClick={(indexInGroup) => handlePhotoClick(groupIndex, indexInGroup)}
            lightboxOpen={lightboxOpen}
          />
        </div>
      ))}
    </div>
  );
}
