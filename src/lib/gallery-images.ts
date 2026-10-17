import { getImage } from "astro:assets";
import type { CollectionEntry } from "astro:content";

const widths = [480, 960, 1440];
const sizes = "(max-width: 768px) 92vw, 1440px";

export async function buildGalleryImages(
  gallery: CollectionEntry<"galleries">,
) {
  return Promise.all(
    gallery.data.images.map(async (image) => {
      const rawSrc = typeof image.src === "string" ? image.src : image.src.src;
      const cleanSrc = rawSrc.split("?")[0].split("#")[0];
      const fileName = cleanSrc.split("/").pop() ?? cleanSrc;
      const webp = await getImage({ src: image.src, widths, format: "webp" });
      const fallback = await getImage({
        src: image.src,
        widths,
        format: "jpeg",
      });

      return {
        rawSrc: cleanSrc,
        fileName,
        alt: image.alt,
        sources: [
          { type: "image/webp", srcset: webp.srcSet.attribute, sizes },
        ],
        fallback: {
          src: fallback.src,
          srcset: fallback.srcSet.attribute,
          sizes,
          width: fallback.attributes.width,
          height: fallback.attributes.height,
        },
      };
    }),
  );
}
