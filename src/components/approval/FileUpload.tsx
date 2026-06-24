"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  X,
  FileText,
  Image,
  Link2,
  Loader2,
  Plus,
} from "lucide-react";
import type { Attachment } from "@/lib/types/approval";

export interface FileUploadHandle {
  flushPendingLink(): Attachment[];
}

export default function FileUpload({
  files,
  onChange,
  onPendingRef,
}: {
  files: Attachment[];
  onChange: (files: Attachment[]) => void;
  onPendingRef?: (ref: FileUploadHandle) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList) {
    setUploading(true);
    const newFiles: Attachment[] = [];

    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/approvals/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          newFiles.push(await res.json());
        }
      } catch {
        // skip failed
      }
    }

    onChange([...files, ...newFiles]);
    setUploading(false);
  }

  function addLink() {
    if (!linkUrl.trim()) return;
    const name = linkName.trim() || linkUrl;
    const updated = [
      ...files,
      { kind: "link" as const, name, url: linkUrl.trim(), size: 0, type: "link" },
    ];
    onChange(updated);
    setLinkUrl("");
    setLinkName("");
    setShowLinkInput(false);
    return updated;
  }

  useEffect(() => {
    onPendingRef?.({
      flushPendingLink() {
        if (!linkUrl.trim()) return files;
        return addLink() || files;
      },
    });
  });

  function formatSize(bytes: number) {
    if (bytes === 0) return "";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  const kindIcon = {
    file: FileText,
    image: Image,
    link: Link2,
  };

  const images = files.filter((f) => f.kind === "image");
  const others = files.filter((f) => f.kind !== "image");

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        첨부
      </label>

      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-text-secondary hover:bg-surface transition-colors disabled:opacity-50"
        >
          <Upload size={12} />
          파일
        </button>
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-text-secondary hover:bg-surface transition-colors disabled:opacity-50"
        >
          <Image size={12} />
          이미지
        </button>
        <button
          type="button"
          onClick={() => setShowLinkInput(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-text-secondary hover:bg-surface transition-colors"
        >
          <Link2 size={12} />
          링크
        </button>
        {uploading && (
          <Loader2 size={14} className="animate-spin text-accent self-center ml-1" />
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />

      {showLinkInput && (
        <div className="flex gap-2 mb-3">
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
            placeholder="URL 입력"
            className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent"
            autoFocus
          />
          <input
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            placeholder="표시 이름 (선택)"
            className="w-36 h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={addLink}
            disabled={!linkUrl.trim()}
            className="h-9 px-3 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLinkInput(false);
              setLinkUrl("");
              setLinkName("");
            }}
            className="h-9 px-2 text-text-secondary hover:text-text-primary"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {images.map((img, i) => {
            const globalIdx = files.indexOf(img);
            return (
              <div key={i} className="relative group">
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-20 h-20 object-cover rounded-lg border border-border"
                />
                <button
                  type="button"
                  onClick={() => onChange(files.filter((_, idx) => idx !== globalIdx))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {others.length > 0 && (
        <div className="space-y-1.5">
          {others.map((file) => {
            const globalIdx = files.indexOf(file);
            const Icon = kindIcon[file.kind || "file"];
            return (
              <div
                key={globalIdx}
                className="flex items-center gap-2 p-2 bg-surface rounded-lg group"
              >
                <Icon size={14} className={`shrink-0 ${file.kind === "link" ? "text-accent" : "text-text-secondary"}`} />
                {file.kind === "link" ? (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent flex-1 truncate hover:underline"
                  >
                    {file.name}
                  </a>
                ) : (
                  <span className="text-sm text-text-primary flex-1 truncate">
                    {file.name}
                  </span>
                )}
                {formatSize(file.size) && (
                  <span className="text-xs text-text-secondary">
                    {formatSize(file.size)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onChange(files.filter((_, idx) => idx !== globalIdx))}
                  className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
