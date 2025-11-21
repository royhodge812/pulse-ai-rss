import { Article, Feed, FeedType } from '../types';

const RSS2JSON_ENDPOINT = 'https://api.rss2json.com/v1/api.json';

// Helper to strip HTML tags for preview
const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

export const fetchRssFeed = async (feed: Feed): Promise<Article[]> => {
  if (feed.type === FeedType.VIRTUAL) {
    // Virtual feeds are handled by the Gemini Service.
    return []; 
  }

  try {
    const response = await fetch(`${RSS2JSON_ENDPOINT}?rss_url=${encodeURIComponent(feed.url)}`);
    const data = await response.json();

    if (data.status !== 'ok') {
      throw new Error('Failed to fetch RSS feed');
    }

    return data.items.map((item: any) => ({
      id: item.guid || item.link,
      feedId: feed.id,
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      content: item.content || item.description || "",
      author: item.author,
      thumbnail: item.thumbnail || (item.enclosure && item.enclosure.link) || null,
      read: false,
      bookmarked: false,
    }));
  } catch (error) {
    console.error("Error fetching RSS feed:", error);
    throw error;
  }
};

export const validateRssUrl = async (url: string): Promise<{ title: string } | null> => {
  try {
    const response = await fetch(`${RSS2JSON_ENDPOINT}?rss_url=${encodeURIComponent(url)}`);
    const data = await response.json();
    if (data.status === 'ok') {
      return { title: data.feed.title };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Generates a standard RSS 2.0 XML string from a list of items.
 */
export const generateRssXml = (
  title: string,
  description: string,
  items: { title: string; link: string; description: string; pubDate: string; guid?: string }[]
): string => {
  const escape = (str: string) => {
    if (!str) return '';
    return str.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  const rssItems = items.map(item => `
    <item>
      <title>${escape(item.title)}</title>
      <link>${escape(item.link)}</link>
      <guid isPermaLink="false">${escape(item.guid || item.link)}</guid>
      <pubDate>${item.pubDate}</pubDate>
      <description>${escape(item.description)}</description>
    </item>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>${escape(title)}</title>
  <description>${escape(description)}</description>
  <link>https://pulse-ai-reader.local</link>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <generator>Pulse AI Reader</generator>
  ${rssItems}
</channel>
</rss>`;
};
