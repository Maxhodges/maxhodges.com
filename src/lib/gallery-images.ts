import { readFile } from "node:fs/promises";
import { getImage } from "astro:assets";
import type { CollectionEntry } from "astro:content";
import sharp from "sharp";
import exifReader from "exif-reader";

const widths = [480, 960, 1440];
const sizes = "(max-width: 768px) 92vw, 1440px";

const formatShutter = (seconds: number) =>
  seconds >= 1 ? `${seconds} s` : `1/${Math.round(1 / seconds)} s`;

const formatExifDate = (date: Date) =>
  [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");

// "f/4 · 1/125 s · ISO 1600 · 24 mm · 2011-03-19", with missing
// fields skipped; empty string when the file carries no camera EXIF.
async function readExifLine(fsPath: string | undefined): Promise<string> {
  if (!fsPath) return "";
  try {
    const { exif } = await sharp(await readFile(fsPath)).metadata();
    if (!exif) return "";
    const tags = exifReader(exif);
    const photo = tags.Photo ?? {};
    const parts: string[] = [];
    if (photo.FNumber) parts.push(`f/${photo.FNumber}`);
    if (photo.ExposureTime) parts.push(formatShutter(photo.ExposureTime));
    const iso = photo.ISOSpeedRatings ?? photo.PhotographicSensitivity;
    if (iso) parts.push(`ISO ${iso}`);
    if (photo.FocalLength) parts.push(`${Math.round(photo.FocalLength)} mm`);
    if (photo.DateTimeOriginal instanceof Date) {
      parts.push(formatExifDate(photo.DateTimeOriginal));
    }
    return parts.join(" · ");
  } catch {
    return "";
  }
}

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
      // Large rendition the lightbox zooms into.
      const sourceWidth = typeof image.src === "string" ? 2048 : image.src.width;
      const full = await getImage({
        src: image.src,
        width: Math.min(2048, sourceWidth),
        format: "webp",
      });

      const exifLine = await readExifLine(
        typeof image.src === "string" ? undefined : image.src.fsPath,
      );

      return {
        exifLine,
        full: {
          src: full.src,
          width: full.attributes.width,
          height: full.attributes.height,
          srcset: webp.srcSet.attribute,
        },
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
