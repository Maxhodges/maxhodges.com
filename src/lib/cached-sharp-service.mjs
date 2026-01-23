import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import sharpService from "astro/assets/services/sharp";

const cacheDir = ".astro/image-cache";

const readFileIfExists = async (path) => {
  try {
    return await fs.readFile(path);
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
};

const cachedSharpService = {
  ...sharpService,
  async transform(inputBuffer, transformOptions, config) {
    const format = transformOptions.format ?? "jpeg";
    const hash = createHash("sha1");
    hash.update(inputBuffer);
    hash.update(
      JSON.stringify({
        ...transformOptions,
        format,
        serviceConfig: config?.service?.config ?? {}
      })
    );
    const cacheKey = hash.digest("hex");
    const cachePath = join(cacheDir, `${cacheKey}.${format}`);
    const cached = await readFileIfExists(cachePath);

    if (cached) {
      return { data: cached, format };
    }

    const result = await sharpService.transform(inputBuffer, transformOptions, config);

    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(cachePath, result.data);

    return result;
  }
};

export default cachedSharpService;
