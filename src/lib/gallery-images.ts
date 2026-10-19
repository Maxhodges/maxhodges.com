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

type ExifInfo = { line: string; date: Date | null };
const exifCache = new Map<string, ExifInfo>();

// "f/4 · 1/125 s · ISO 1600 · 24 mm · 2011-03-19", with missing
// fields skipped; empty line when the file carries no camera EXIF.
async function readExif(fsPath: string | undefined): Promise<ExifInfo> {
  if (!fsPath) return { line: "", date: null };
  const cached = exifCache.get(fsPath);
  if (cached) return cached;
  let info: ExifInfo = { line: "", date: null };
  try {
    const { exif } = await sharp(await readFile(fsPath)).metadata();
    if (exif) {
      const tags = exifReader(exif);
      const photo = tags.Photo ?? {};
      const parts: string[] = [];
      if (photo.FNumber) parts.push(`f/${photo.FNumber}`);
      if (photo.ExposureTime) parts.push(formatShutter(photo.ExposureTime));
      const iso = photo.ISOSpeedRatings ?? photo.PhotographicSensitivity;
      if (iso) parts.push(`ISO ${iso}`);
      if (photo.FocalLength) parts.push(`${Math.round(photo.FocalLength)} mm`);
      const date =
        photo.DateTimeOriginal instanceof Date ? photo.DateTimeOriginal : null;
      if (date) parts.push(formatExifDate(date));
      info = { line: parts.join(" · "), date };
    }
  } catch {
    // treat unreadable EXIF as absent
  }
  exifCache.set(fsPath, info);
  return info;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "March 2011" (one month), "2011" (one year) or "2006–2012",
// from the shoot dates of the photos that carry EXIF; "" when none do.
export async function galleryDateRange(
  gallery: CollectionEntry<"galleries">,
): Promise<string> {
  const dates: Date[] = [];
  for (const image of gallery.data.images) {
    const fsPath = typeof image.src === "string" ? undefined : image.src.fsPath;
    const { date } = await readExif(fsPath);
    if (date) dates.push(date);
  }
  if (dates.length === 0) return "";
  const times = dates.map((d) => d.getTime());
  const min = new Date(Math.min(...times));
  const max = new Date(Math.max(...times));
  if (min.getUTCFullYear() !== max.getUTCFullYear()) {
    return `${min.getUTCFullYear()}–${max.getUTCFullYear()}`;
  }
  if (min.getUTCMonth() !== max.getUTCMonth()) {
    return `${min.getUTCFullYear()}`;
  }
  return `${MONTHS[min.getUTCMonth()]} ${min.getUTCFullYear()}`;
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

      const { line: exifLine } = await readExif(
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
