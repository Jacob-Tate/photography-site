interface AlbumDownloadButtonProps {
  albumPath: string;
  albumName: string;
}

export default function AlbumDownloadButton({ albumPath, albumName }: AlbumDownloadButtonProps) {
  const downloadUrl = `/api/download/album/${albumPath.replace('albums/', '')}`;

  return (
    <a
      href={downloadUrl}
      download={`${albumName}.zip`}
      className="inline-flex items-center gap-2 p-2 sm:px-4 sm:py-2 bg-neutral-800 hover:bg-neutral-700 rounded-md text-white transition-colors"
      aria-label="Download All"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <span className="hidden sm:inline">Download All</span>
    </a>
  );
}
