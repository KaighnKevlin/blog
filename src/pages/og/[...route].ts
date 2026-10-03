import { getCollection } from 'astro:content';
import { OGImageRoute } from 'astro-og-canvas';

// Generate a link-preview (Open Graph) card for every blog post at build time.
// Each card shows the post title + "kaighn.com" on a warm paper card with a tomato
// accent bar. Served at /og/<post-slug>.png and referenced from BaseHead.astro.
const entries = await getCollection('blog');

const pages = Object.fromEntries(entries.map((entry) => [entry.id, entry.data]));

export const { getStaticPaths, GET } = await OGImageRoute({
	param: 'route',
	pages,
	getImageOptions: (_id, page: (typeof pages)[string]) => ({
		title: page.title,
		description: 'kaighn.com',
		bgGradient: [
			[247, 244, 238],
			[239, 234, 224],
		],
		border: { color: [229, 72, 47], width: 24, side: 'inline-start' },
		padding: 80,
		font: {
			title: {
				color: [27, 26, 23],
				size: 72,
				weight: 'Bold',
				lineHeight: 1.15,
			},
			description: {
				color: [111, 106, 96],
				size: 34,
				weight: 'Normal',
			},
		},
	}),
});
