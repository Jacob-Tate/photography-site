import { Marked, Renderer } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

function isRelativeUrl(url: string): boolean {
  return !url.startsWith('http://') &&
         !url.startsWith('https://') &&
         !url.startsWith('/') &&
         !url.startsWith('data:');
}

function createMarked(albumPath?: string): Marked {
  const marked = new Marked();

  // Add GFM heading IDs (for anchor links)
  marked.use(gfmHeadingId());

  // Add syntax highlighting for code blocks
  marked.use(
    markedHighlight({
      langPrefix: 'hljs language-',
      highlight(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch {
            // Fall through to auto-detect
          }
        }
        try {
          return hljs.highlightAuto(code).value;
        } catch {
          return code;
        }
      },
    })
  );

  // Custom renderer to resolve relative image paths
  if (albumPath) {
    const renderer = new Renderer();

    renderer.image = function({ href, title, text }) {
      let thumbSrc = href;
      const filename = href;
      const isLocal = isRelativeUrl(href);

      // Resolve relative URLs to album images
      if (isLocal) {
        thumbSrc = `/api/images/thumbnail/${albumPath}/${href}`;
      }

      // Local images get a data attribute for lightbox integration
      const dataAttr = isLocal ? ` data-lightbox-image="${filename}"` : '';
      const img = `<a href="#"${dataAttr} class="readme-lightbox"><img src="${thumbSrc}" alt="${text || ''}" loading="lazy"></a>`;

      // If there's a title, display it as a caption below the image
      if (title) {
        return `<figure>${img}<figcaption>${title}</figcaption></figure>`;
      }

      return img;
    };

    marked.use({ renderer });
  }

  // Configure marked options
  marked.setOptions({
    gfm: true,
    breaks: true,
  });

  return marked;
}

export async function renderMarkdown(content: string, albumPath?: string): Promise<string> {
  const marked = createMarked(albumPath);
  return await marked.parse(content);
}
