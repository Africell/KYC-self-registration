import type { PixelCrop } from "react-image-crop";

export async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  rotation = 0,
): Promise<string> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not found");

  // Scale from displayed size → natural resolution
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = "high";

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;
  const centerX = image.naturalWidth / 2;
  const centerY = image.naturalHeight / 2;
  const rotationRad = (rotation * Math.PI) / 180;

  ctx.save();
  // Move so the crop origin is at canvas (0,0), rotate around image center
  ctx.translate(-cropX, -cropY);
  ctx.translate(centerX, centerY);
  ctx.rotate(rotationRad);
  ctx.translate(-centerX, -centerY);
  ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, image.naturalWidth, image.naturalHeight);
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.95);
}
