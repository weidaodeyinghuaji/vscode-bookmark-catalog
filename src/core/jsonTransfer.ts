import { BookmarkExportPayload, BookmarkItem } from "./types";

export function toExportPayload(bookmarks: BookmarkItem[]): BookmarkExportPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    bookmarks
  };
}

export function parseImportPayload(raw: string): BookmarkItem[] {
  const parsed = JSON.parse(raw) as Partial<BookmarkExportPayload>;
  if (parsed.version !== 1 || !Array.isArray(parsed.bookmarks)) {
    throw new Error("导入文件格式不正确。");
  }

  return parsed.bookmarks.map((item) => validateBookmark(item));
}

function validateBookmark(input: unknown): BookmarkItem {
  if (!input || typeof input !== "object") {
    throw new Error("导入数据项结构错误。");
  }
  const item = input as Record<string, unknown>;
  const requiredStringFields = ["id", "title", "uri", "category", "createdAt", "updatedAt"];
  for (const field of requiredStringFields) {
    if (typeof item[field] !== "string") {
      throw new Error(`字段 ${field} 缺失或类型错误。`);
    }
  }
  if (typeof item.line !== "number" || typeof item.character !== "number") {
    throw new Error("字段 line/character 缺失或类型错误。");
  }
  if (!Array.isArray(item.tags) || item.tags.some((tag) => typeof tag !== "string")) {
    throw new Error("字段 tags 缺失或类型错误。");
  }

  return {
    id: String(item.id),
    title: String(item.title),
    uri: String(item.uri),
    line: Number(item.line),
    character: Number(item.character),
    category: String(item.category),
    tags: (item.tags as string[]).map(String),
    createdAt: String(item.createdAt),
    updatedAt: String(item.updatedAt)
  };
}
