const MAX_PROFILE_DIMENSION = 512;
const WEBP_QUALITY = 0.82;
const SKIP_OPTIMIZE_BELOW_BYTES = 120_000;

function scaleDimensions(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function buildOptimizedName(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, "") || "profile";
  return `${base}.webp`;
}

/**
 * Resize and compress raster profile photos in the browser before upload.
 * SVG and unsupported formats are returned unchanged.
 */
export async function optimizeProfileImageFile(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  if (file.size <= SKIP_OPTIMIZE_BELOW_BYTES && file.type === "image/webp") return file;

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width, height } = scaleDimensions(
        image.naturalWidth,
        image.naturalHeight,
        MAX_PROFILE_DIMENSION,
      );
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(file);
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const optimized = new File([blob], buildOptimizedName(file.name), {
            type: "image/webp",
            lastModified: Date.now(),
          });
          resolve(optimized.size < file.size ? optimized : file);
        },
        "image/webp",
        WEBP_QUALITY,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    image.src = objectUrl;
  });
}
