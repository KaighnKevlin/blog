import { type CollectionEntry, getCollection } from 'astro:content';

export type Post = CollectionEntry<'blog'>;
export type PostKind = 'interactive' | 'essay' | 'launch';

export const KIND_LABEL: Record<PostKind, string> = {
	interactive: 'Interactive',
	essay: 'Essay',
	launch: 'Launch',
};

/** All posts, newest first. */
export async function getPosts(): Promise<Post[]> {
	return (await getCollection('blog')).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);
}

/**
 * A post's kind: explicit `kind` frontmatter wins; otherwise a post that
 * imports a component is interactive, an "Announcing:" title is a launch,
 * and everything else is an essay.
 */
export function postKind(post: Post): PostKind {
	if (post.data.kind) return post.data.kind;
	if (/^import\s.+components\//m.test(post.body ?? '')) return 'interactive';
	if (/^announcing\b/i.test(post.data.title)) return 'launch';
	return 'essay';
}

/** Estimated reading time in minutes, counting prose only (no imports/JSX). */
export function readingMinutes(post: Post): number {
	const prose = (post.body ?? '')
		.replace(/^import .*$/gm, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/[#*_`>\[\]()]/g, ' ');
	const words = prose.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 230));
}

/** A one-line meta string, e.g. "Interactive" or "6 min read". */
export function postMeta(post: Post): string {
	const kind = postKind(post);
	if (kind === 'essay') return `${readingMinutes(post)} min read`;
	return KIND_LABEL[kind];
}
