"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Camera, X, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { PHOTO_CONFIG, validatePhotoFile } from "@/lib/utils/photo-validation";

interface PhotoUploadSectionProps {
  token: string;
  onPhotoUploaded: (photoUrl: string | null) => void;
}

interface FileError {
  code: string;
  message: string;
}

interface FileRejection {
  file: File;
  errors: FileError[];
}

export function PhotoUploadSection({ token, onPhotoUploaded }: PhotoUploadSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const processAndUploadFile = useCallback(
    async (file: File) => {
      setIsUploading(true);

      try {
        // Create preview URL
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);

        // Step 1: Get signed upload URL from our API
        const signedUrlResponse = await fetch("/api/onboarding/public/signed-upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            mimeType: file.type,
            fileSize: file.size,
          }),
        });

        const signedUrlResult = await signedUrlResponse.json();

        if (!signedUrlResponse.ok) {
          throw new Error(signedUrlResult.error || "Failed to get upload URL");
        }

        // Step 2: Upload file directly to Supabase Storage using signed URL
        const uploadResponse = await fetch(signedUrlResult.data.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file to storage");
        }

        // Store the uploaded URL
        const photoUrl = signedUrlResult.data.filePath;
        setUploadedUrl(photoUrl);
        onPhotoUploaded(photoUrl);
        toast.success("Photo uploaded successfully!");
      } catch (error) {
        console.error("Upload error:", error);
        const message = error instanceof Error ? error.message : "Upload failed";
        toast.error(message);

        // Clear preview on error
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [token, onPhotoUploaded],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Handle rejected files first
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection?.errors?.some((e: FileError) => e.code === "file-too-large")) {
          toast.error(
            `File too large. Maximum size is ${Math.round(PHOTO_CONFIG.maxFileSize / 1024)}KB`,
          );
        } else if (rejection?.errors?.some((e: FileError) => e.code === "file-invalid-type")) {
          toast.error("Invalid file type. Please select a JPEG, PNG, WebP, or GIF image.");
        } else {
          toast.error("File rejected. Please try another image.");
        }
        return;
      }

      const file = acceptedFiles[0];
      if (file) {
        // Additional validation with our utility
        const validation = validatePhotoFile(file);
        if (!validation.valid) {
          toast.error(validation.error);
          return;
        }

        processAndUploadFile(file);
      }
    },
    [processAndUploadFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif"],
    },
    maxFiles: 1,
    maxSize: PHOTO_CONFIG.maxFileSize, // 512KB
    disabled: isUploading,
  });

  const handleRemovePhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setUploadedUrl(null);
    onPhotoUploaded(null);
  };

  const hasPhoto = previewUrl || uploadedUrl;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!hasPhoto && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
            ${isUploading ? "pointer-events-none opacity-50" : ""}
          `}
        >
          <input {...getInputProps()} />

          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-600">Processing your photo...</p>
              <p className="text-sm text-gray-500 mt-1">Optimizing and uploading securely</p>
            </div>
          ) : isDragActive ? (
            <div className="flex flex-col items-center">
              <Upload className="h-12 w-12 text-blue-500 mb-4" />
              <p className="text-gray-600">Drop your photo here</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Camera className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">Upload your profile photo</p>
              <p className="text-sm text-gray-500 mb-4">Drag and drop, or click to select</p>
              <Button type="button" variant="outline" disabled={isUploading}>
                Choose Photo
              </Button>
              <p className="text-xs text-gray-400 mt-2">
                JPG, PNG, WebP up to {Math.round(PHOTO_CONFIG.maxFileSize / 1024)}KB
                <br />
                <span className="text-gray-500">We'll optimize it to ~10KB for fast loading</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Photo Preview */}
      {hasPhoto && (
        <div className="relative">
          <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white shadow-lg">
            <Image
              src={previewUrl || uploadedUrl!}
              alt="Profile photo preview"
              fill
              className="object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
          </div>

          {!isUploading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemovePhoto}
              className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              {isUploading ? "Uploading..." : "Photo uploaded successfully"}
            </p>
            {!isUploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemovePhoto}
                className="mt-1 text-red-600 hover:text-red-700"
              >
                Remove photo
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
