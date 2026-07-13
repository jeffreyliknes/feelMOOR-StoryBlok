/**
 * Storyblok content layer. Fetches stories from the Content Delivery API and
 * flattens Storyblok field shapes back to the plain JSON shapes the templates
 * were originally written for (asset -> URL string, blok lists -> arrays).
 *
 * Draft content is served when the page runs inside the Storyblok visual
 * editor (?_storyblok=...) or in `astro dev`; production requests get
 * published content.
 */
import { renderRichText as sbRender } from '@storyblok/richtext';

const TOKEN = import.meta.env.STORYBLOK_PREVIEW_TOKEN;
const CDA = 'https://api.storyblok.com/v2/cdn';

type HasUrl = { url: URL };

export function isPreview(astro: HasUrl): boolean {
  return astro.url.searchParams.has('_storyblok') || import.meta.env.DEV;
}

async function cda(path: string, params: Record<string, string>, draft: boolean) {
  const url = new URL(CDA + path);
  url.searchParams.set('token', TOKEN);
  url.searchParams.set('version', draft ? 'draft' : 'published');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, draft ? { cache: 'no-store' } : {});
  if (!res.ok) throw new Error(`Storyblok ${path} -> ${res.status}`);
  return res.json();
}

function flatten(value: any): any {
  if (Array.isArray(value)) return value.map(flatten);
  if (value && typeof value === 'object') {
    if (value.fieldtype === 'asset') return value.filename || '';
    if (value.type === 'doc') return value; // richtext document, render with renderRichText()
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = k.startsWith('_') ? v : flatten(v);
    return out;
  }
  return value;
}

/** Fetch one story; returns its flattened content. Throws on 404. */
export async function getStory(slug: string, astro: HasUrl) {
  const { story } = await cda(`/stories/${slug}`, {}, isPreview(astro));
  return flatten(story.content);
}

/** Fetch a folder of stories in getCollection()-compatible `{ slug, data }` shape. */
export async function getStories(startsWith: string, astro: HasUrl) {
  const { stories } = await cda(
    '/stories',
    { starts_with: startsWith, per_page: '100' },
    isPreview(astro)
  );
  return stories.map((s: any) => ({ slug: s.slug, data: flatten(s.content) }));
}

/** Splits a "one per line" textarea back into the string[] the templates expect. */
export const lines = (s?: string): string[] =>
  s ? s.split('\n').map((l) => l.trim()).filter(Boolean) : [];

/** Visual-editor click-to-edit attributes for a blok (no-op outside draft mode). */
export function sbe(blok: any): Record<string, string> {
  if (!blok?._editable) return {};
  const opt = JSON.parse(blok._editable.replace(/^<!--#storyblok#/, '').replace(/-->$/, ''));
  return { 'data-blok-c': JSON.stringify(opt), 'data-blok-uid': `${opt.id}-${opt.uid}` };
}

export const renderRichText = (doc: any): string => (doc ? String(sbRender(doc)) : '');
