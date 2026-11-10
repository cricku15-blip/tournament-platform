"use client";

import * as React from "react";
import Image from "next/image";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface ImageUploaderProps {
  bucket: "avatars" | "tournament-banners" | "team-logos";
  userId?: string;
  value?: string | null;
  onChange?: (url: string | null) => void;
  maxWidth?: number;
  quality?: number;
  aspectRatio?: "1:1" | "16:9" | "auto";
  disabled?: boolean;
  className?: string;
}

/**
 * Resizes an image file in the browser before upload to max width (default 1600px)
 * and converts to WebP at 0.85 quality.
 */
export async function resizeImageInBrowser(
  file: File,
  maxWidth = 1600,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get 2D canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Image compression failed"));
          }
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for resizing"));
    };

    img.src = url;
  });
}

export function ImageUploader({
  bucket,
  userId,
  value,
  onChange,
  maxWidth = 1600,
  quality = 0.85,
  aspectRatio = "auto",
  disabled = false,
  className,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const previewUrl = uploadedUrl !== null ? uploadedUrl : (value || null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      // 1. Client-side resize to WebP 0.85
      const resizedBlob = await resizeImageInBrowser(file, maxWidth, quality);

      // 2. Prepare path
      const supabase = createClient();
      const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id || "anon";
      const fileName = `${currentUserId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.webp`;

      // 3. Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, resizedBlob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // 4. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      const publicUrl = publicUrlData.publicUrl;
      setUploadedUrl(publicUrl);
      onChange?.(publicUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload image";
      setError(msg);
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setUploadedUrl(null);
    onChange?.(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const aspectClasses = {
    "1:1": "aspect-square max-w-[200px]",
    "16:9": "aspect-video max-w-[480px]",
    auto: "min-h-[160px]",
  };

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        disabled={disabled || isUploading}
        onChange={handleFileChange}
        className="sr-only"
        id={`image-upload-${bucket}`}
      />

      {previewUrl ? (
        <div
          className={cn(
            "relative overflow-hidden rounded-card border border-line bg-surface group",
            aspectClasses[aspectRatio]
          )}
        >
          <Image
            src={previewUrl}
            alt="Uploaded preview"
            width={800}
            height={450}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || isUploading}
              className="bg-card text-ink"
            >
              Change
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={`image-upload-${bucket}`}
          className={cn(
            "flex flex-col items-center justify-center rounded-card border-2 border-dashed border-line p-6 text-center cursor-pointer transition-colors bg-card hover:bg-surface/50 select-none",
            "focus-within:outline-2 focus-within:outline-primary focus-within:outline-offset-2",
            disabled && "cursor-not-allowed opacity-45",
            aspectClasses[aspectRatio]
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm font-medium text-ink">
                Resizing & uploading...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <UploadCloud className="h-8 w-8 text-muted" />
              <div className="text-sm font-semibold text-ink">
                Click to upload image
              </div>
              <p className="text-xs text-muted">
                Max 1600px width, auto-converted to WebP
              </p>
            </div>
          )}
        </label>
      )}

      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
