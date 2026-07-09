import { randomUUID } from "node:crypto";
import { BookmarkInput, BookmarkItem, StorageAdapter } from "./types";

export class BookmarkService {
  private readonly defaultCategory: string;

  constructor(
    private readonly storage: StorageAdapter,
    defaultCategory = "默认"
  ) {
    this.defaultCategory = defaultCategory;
  }

  async list(): Promise<BookmarkItem[]> {
    const all = await this.storage.getBookmarks();
    return [...all].sort(
      (a, b) =>
        a.category.localeCompare(b.category, "zh-Hans-CN") ||
        a.title.localeCompare(b.title, "zh-Hans-CN")
    );
  }

  async add(input: BookmarkInput): Promise<BookmarkItem> {
    const now = new Date().toISOString();
    const category = sanitizeCategory(input.category ?? this.defaultCategory);
    const bookmark: BookmarkItem = {
      id: randomUUID(),
      title: input.title.trim(),
      uri: input.uri,
      line: input.line,
      character: input.character,
      category,
      tags: normalizeTags(input.tags ?? []),
      createdAt: now,
      updatedAt: now
    };

    const all = await this.storage.getBookmarks();
    all.push(bookmark);
    await this.storage.saveBookmarks(all);
    return bookmark;
  }

  async remove(id: string): Promise<boolean> {
    const all = await this.storage.getBookmarks();
    const next = all.filter((b) => b.id !== id);
    if (next.length === all.length) {
      return false;
    }

    await this.storage.saveBookmarks(next);
    return true;
  }

  async updateCategory(id: string, category: string): Promise<boolean> {
    const all = await this.storage.getBookmarks();
    const nextCategory = sanitizeCategory(category);
    let updated = false;

    const mapped = all.map((item) => {
      if (item.id !== id) {
        return item;
      }
      updated = true;
      return { ...item, category: nextCategory, updatedAt: new Date().toISOString() };
    });

    if (!updated) {
      return false;
    }

    await this.storage.saveBookmarks(mapped);
    return true;
  }

  async search(keyword: string): Promise<BookmarkItem[]> {
    const all = await this.list();
    const q = keyword.trim().toLowerCase();
    if (!q) {
      return all;
    }

    return all.filter((item) => {
      const haystack = [
        item.title,
        item.category,
        item.uri,
        ...item.tags
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }

  async replaceAll(bookmarks: BookmarkItem[]): Promise<void> {
    const normalized = bookmarks.map((item) => ({
      ...item,
      title: item.title.trim(),
      category: sanitizeCategory(item.category),
      tags: normalizeTags(item.tags)
    }));
    await this.storage.saveBookmarks(normalized);
  }
}

function normalizeTags(tags: string[]): string[] {
  return tags
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);
}

function sanitizeCategory(category: string): string {
  const value = category.trim();
  return value.length > 0 ? value : "未分类";
}
