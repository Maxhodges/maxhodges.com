import { defineCollection, z } from "astro:content";

const galleries = defineCollection({
  type: "data",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      order: z.number().int(),
      visible: z.boolean().optional().default(true),
      coverImage: image(),
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
    }),
});

export const collections = { galleries, blog };
