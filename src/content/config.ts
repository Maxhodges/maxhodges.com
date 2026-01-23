import { defineCollection, z } from "astro:content";

const galleries = defineCollection({
  type: "data",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      order: z.number().int(),
      coverImage: image(),
      images: z.array(
        z.object({
          src: image(),
          alt: z.string(),
        })
      ),
    }),
});

export const collections = { galleries };
