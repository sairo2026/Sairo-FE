"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";
import { PROPERTY_ENTRY_COPY } from "@/shared/legal/notice-copy";

export const PHOTO_MAX_COUNT = 20;
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_EXTENSION = /\.(jpe?g|png|webp)$/i;

export function validatePhotoFile(file: File, currentCount: number): string | undefined {
  if (currentCount >= PHOTO_MAX_COUNT) return `사진은 ${PHOTO_MAX_COUNT}장까지 올릴 수 있습니다.`;
  const isAllowedType = PHOTO_MIME.includes(file.type) || PHOTO_EXTENSION.test(file.name);
  if (!isAllowedType) return "JPG, PNG, WebP 형식의 사진만 올릴 수 있습니다.";
  if (file.size > PHOTO_MAX_BYTES) return "사진은 한 장에 10MB 이하여야 합니다.";
  return undefined;
}

export type PhotoCard = {
  key: string;
  previewUrl: string | null;
  description: string;
  sortOrder: number;
};

function createPreviewUrl(file: File): string | null {
  return typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null;
}

export type QueuedPhoto = {
  key: string;
  file: File;
  description: string;
  previewUrl: string | null;
};

export function toQueuedPhoto(file: File, key: string): QueuedPhoto {
  return { key, file, description: "", previewUrl: createPreviewUrl(file) };
}

function PhotoPicker({
  count,
  isBusy,
  onPick,
}: {
  count: number;
  isBusy?: boolean;
  onPick: (files: File[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="inline-flex w-fit cursor-pointer items-center rounded-control border border-primary bg-primary-soft px-4 py-2 text-caption font-semibold text-primary hover:bg-primary-line">
        사진 추가
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={isBusy || count >= PHOTO_MAX_COUNT}
          className="sr-only"
          aria-label="사진 파일 선택"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length > 0) onPick(files);
          }}
        />
      </label>
      <p className="text-caption text-ink-2">
        JPG, PNG, WebP, 한 장당 10MB 이하, 최대 {PHOTO_MAX_COUNT}장까지 올릴 수 있습니다.
      </p>
      <p className="text-caption text-ink-2">{PROPERTY_ENTRY_COPY.photoNotice}</p>
    </div>
  );
}

function Thumb({ url, alt }: { url: string | null; alt: string }) {
  if (url === null) {
    return (
      <div className="flex h-32 items-center justify-center bg-surface text-caption text-ink-3">
        미리보기 없음
      </div>
    );
  }
  return (
    <Image
      src={url}
      alt={alt}
      width={320}
      height={192}
      unoptimized
      className="h-32 w-full rounded-small object-cover"
    />
  );
}

export function QueuedPhotoList({
  photos,
  error,
  onAdd,
  onChange,
  onRemove,
}: {
  photos: QueuedPhoto[];
  error?: string;
  onAdd: (files: File[]) => void;
  onChange: (key: string, description: string) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <PhotoPicker count={photos.length} onPick={onAdd} />
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
      {photos.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, index) => (
            <li
              key={photo.key}
              className="flex flex-col gap-2 rounded-card-flat border border-line p-3"
            >
              <Thumb url={photo.previewUrl} alt={`${photo.file.name} 미리보기`} />
              <p className="text-caption text-ink-2">
                {index + 1}번째 · {photo.file.name}
              </p>
              <TextField
                label="사진 설명"
                value={photo.description}
                maxLength={100}
                onValueChange={(value) => onChange(photo.key, value)}
              />
              <Button variant="ghost" size="sm" onClick={() => onRemove(photo.key)}>
                목록에서 빼기
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export type SavedPhoto = {
  photoId: number;
  url: string;
  description: string | null;
  sortOrder: number;
};

export function SavedPhotoList({
  photos,
  error,
  isBusy,
  onAdd,
  onSave,
  onDelete,
}: {
  photos: SavedPhoto[];
  error?: string;
  isBusy: boolean;
  onAdd: (files: File[]) => void;
  onSave: (photoId: number, description: string, sortOrder: number) => void;
  onDelete: (photoId: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <PhotoPicker count={photos.length} isBusy={isBusy} onPick={onAdd} />
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
      {photos.length === 0 ? (
        <p className="text-caption text-ink-2">등록된 사진이 없습니다.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <SavedPhotoItem
              key={`${photo.photoId}-${photo.description ?? ""}-${photo.sortOrder}`}
              photo={photo}
              isBusy={isBusy}
              onSave={onSave}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SavedPhotoItem({
  photo,
  isBusy,
  onSave,
  onDelete,
}: {
  photo: SavedPhoto;
  isBusy: boolean;
  onSave: (photoId: number, description: string, sortOrder: number) => void;
  onDelete: (photoId: number) => void;
}) {
  const [description, setDescription] = useState(photo.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(photo.sortOrder));
  const isChanged =
    description !== (photo.description ?? "") || sortOrder !== String(photo.sortOrder);
  const isOrderValid = /^\d+$/.test(sortOrder) && Number(sortOrder) > 0;
  return (
    <li className="flex flex-col gap-2 rounded-card-flat border border-line p-3">
      <Thumb url={photo.url} alt={photo.description ?? `매물 사진 ${photo.sortOrder}`} />
      <TextField
        label="사진 설명"
        value={description}
        maxLength={100}
        onValueChange={setDescription}
      />
      <TextField
        label="정렬 순서"
        kind="number"
        value={sortOrder}
        onValueChange={setSortOrder}
        error={isOrderValid ? undefined : "1 이상의 숫자로 입력해 주세요."}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outlined"
          disabled={!isChanged || !isOrderValid}
          isLoading={isBusy}
          onClick={() => onSave(photo.photoId, description, Number(sortOrder))}
        >
          설명·순서 저장
        </Button>
        <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => onDelete(photo.photoId)}>
          사진 삭제
        </Button>
      </div>
    </li>
  );
}
