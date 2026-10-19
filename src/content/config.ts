import { defineCollection, z } from "astro:content";

const galleries = defineCollection({
  type: "data",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      order: z.number().int(),
      visible: z.boolean().optional().default(true),
      // Optional — the first entry in `images` is the cover when omitted.
      coverImage: image().optional(),
      images: z.array(
        z.object({
          src: image(),
          alt: z.string(),
        })
      ),
    }),
});

const blog = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.date(),
      heroImage: image(),
      // Set when the article is a standalone interactive page: the blog
      // index links there and no Markdown page is generated for the stub.
      link: z.string().optional(),
    }),
});

export const collections = { galleries, blog };
