import { useRef, useEffect } from 'react';

interface SocialPreset {
  id: string;
  name: string;
  platform: string;
  width: number;
  height: number | null;
  aspectRatio: string;
  format: 'jpeg' | 'png';
}

const SOCIAL_PRESETS: SocialPreset[] = [
  { id: 'instagram-square', name: 'Square', platform: 'Instagram', width: 1080, height: 1080, aspectRatio: '1:1', format: 'jpeg' },
  { id: 'instagram-portrait', name: 'Portrait', platform: 'Instagram', width: 1080, height: 1350, aspectRatio: '4:5', format: 'jpeg' },
  { id: 'instagram-landscape', name: 'Landscape', platform: 'Instagram', width: 1080, height: 566, aspectRatio: '1.91:1', format: 'jpeg' },
  { id: 'instagram-stories', name: 'Stories', platform: 'Instagram', width: 1080, height: 1920, aspectRatio: '9:16', format: 'jpeg' },
  { id: 'facebook-optimized', name: 'Optimized', platform: 'Facebook', width: 2048, height: null, aspectRatio: 'original', format: 'png' },
  { id: 'twitter-16x9', name: '16:9', platform: 'Twitter/X', width: 1600, height: 900, aspectRatio: '16:9', format: 'jpeg' },
  { id: 'linkedin-post', name: 'Post', platform: 'LinkedIn', width: 1200, height: 627, aspectRatio: '1.91:1', format: 'jpeg' },
];

// Group presets by platform
const PLATFORMS = ['Instagram', 'Facebook', 'Twitter/X', 'LinkedIn'] as const;
const presetsByPlatform = PLATFORMS.map(platform => ({
  platform,
  presets: SOCIAL_PRESETS.filter(p => p.platform === platform),
}));

interface SocialExportPanelProps {
  imagePath: string;
  onClose: () => void;
}

export default function SocialExportPanel({ imagePath, onClose }: SocialExportPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePresetClick = (preset: SocialPreset) => {
    const url = `/api/images/social/${preset.id}/${imagePath}`;
    if (downloadRef.current) {
      downloadRef.current.href = url;
      downloadRef.current.click();
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute top-16 right-4 z-30 bg-black/90 backdrop-blur-sm rounded-lg p-4 min-w-[280px] max-w-[320px] max-h-[70vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-medium text-sm">Export for Social Media</h3>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white p-1"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {presetsByPlatform.map(({ platform, presets }) => (
        <div key={platform} className="mb-4 last:mb-0">
          <div className="text-white/50 text-xs uppercase tracking-wide mb-2">{platform}</div>
          <div className="space-y-1">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset)}
                className="w-full flex items-center justify-between p-2 rounded bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <div>
                  <div className="text-white text-sm font-medium">{preset.name}</div>
                  <div className="text-white/50 text-xs">
                    {preset.height ? `${preset.width}×${preset.height}` : `${preset.width}px max`}
                    {' · '}
                    {preset.aspectRatio}
                    {' · '}
                    {preset.format.toUpperCase()}
                  </div>
                </div>
                <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-3 pt-3 border-t border-white/10 text-white/40 text-xs">
        Images are center-cropped to fit each format. Facebook exports use PNG to minimize recompression quality loss.
      </div>

      {/* Hidden download anchor */}
      <a ref={downloadRef} className="hidden" download />
    </div>
  );
}
