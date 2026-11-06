import { linkUrl } from '@repo/contracts/universal';
import { LINK } from './link.constants';

function linkDecode(text: string) {
  return text.replaceAll(/&(?:#x([\da-f]+)|#(\d+)|([a-z]+));/gi, (entity, hex: string | undefined, decimal: string | undefined, name: string | undefined) => {
    const point = hex ? Number.parseInt(hex, 16) : Number(decimal);

    if ((hex ?? decimal) && point <= LINK.maxCodePoint) {
      return String.fromCodePoint(point);
    }

    return LINK.entities.get(name?.toLowerCase() ?? '') ?? entity;
  });
}

function linkText(text: string | undefined, maxLength: number) {
  const value = text ? linkDecode(text).replaceAll(/\s+/g, ' ').trim() : '';

  return value ? value.slice(0, maxLength) : null;
}

function linkMetaTags(html: string) {
  const tags = new Map<string, string>();

  for (const [tag] of html.matchAll(/<meta\s[^>]*>/gi)) {
    const attributes = new Map([...tag.matchAll(/([\w:-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g)]
      .map(([, name = '', value = '']) => [name.toLowerCase(), value.replaceAll(/^["']|["']$/g, '')]));

    const key = (attributes.get('property') ?? attributes.get('name'))?.toLowerCase();
    const content = attributes.get('content');

    if (key && content && !tags.has(key)) {
      tags.set(key, content);
    }
  }

  return tags;
}

export function linkPreviewParse(url: string, html: string) {
  const tags = linkMetaTags(html);
  const title = tags.get('og:title') ?? tags.get('twitter:title') ?? /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1];
  const description = tags.get('og:description') ?? tags.get('twitter:description') ?? tags.get('description');
  const image = tags.get('og:image') ?? tags.get('og:image:url') ?? tags.get('twitter:image');
  const imageUrl = image ? linkUrl.safeParse(URL.parse(linkDecode(image), url)?.toString()).data : undefined;

  return {
    url,
    title: linkText(title, LINK.maxTitleLength),
    description: linkText(description, LINK.maxDescriptionLength),
    imageUrl: imageUrl ?? null,
    siteName: linkText(tags.get('og:site_name'), LINK.maxTitleLength),
  };
}
