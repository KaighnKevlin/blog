import { getCollection } from 'astro:content';
import { OGImageRoute } from 'astro-og-canvas';

// Generate a link-preview (Open Graph) card for every blog post at build time.
// Each card shows the post title + "kaighn.com" on a light card with an accent
// bar. Served at /og/<post-slug>.png and referenced from BaseHead.astro.
const entries = await getCollection('blog');

const pages = Object.fromEntries(entries.map((entry) => [entry.id, entry.data]));

export const { getStaticPaths, GET } = await OGImageRoute({
	param: 'route',
	pages,
	getImageOptions: (_id, page: (typeof pages)[string]) => ({
		title: page.title,
		description: 'kaighn.com',
		bgGradient: [
			[255, 255, 255],
			[241, 241, 245],
		],
		border: { color: [35, 55, 255], width: 24, side: 'inline-start' },
		padding: 80,
		font: {
			title: {
				color: [24, 24, 27],
				size: 72,
				weight: 'Bold',
				lineHeight: 1.15,
			},
			description: {
				color: [82, 82, 91],
				size: 34,
				weight: 'Normal',
			},
		},
	}),
});
