# Blog — kaighn.com

Astro v6 + MDX + Tailwind CSS v4, deployed to Cloudflare Pages.

## Writing blog posts

- Create `.mdx` files in `src/content/blog/` with frontmatter: `title`, `description`, `pubDate`.
- Interactive components go in `src/components/` as `.astro` files. Use `<script>` tags for client-side JS.
- Import components in the MDX file and use them inline.
- See `src/content/blog/yimby-nyc.mdx` and its components (e.g. `ScenarioExplorer.astro`) as a working example.

## Branching

Always create a new branch for a blog post: `git checkout -b post/short-slug`. Do not commit directly to main. When the post is done, the user will merge to main and deploy.

## Dev server

Run `bun run dev` to preview at http://localhost:4321.

## Deploying

**Never auto-deploy.** Only deploy when explicitly asked:
```
bun run build && bunx wrangler@3 pages deploy dist --project-name blog --commit-dirty=true
```

## Package manager

Use `bun`, not npm/npx.
