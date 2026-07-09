import { describe, expect, it } from "vitest";
import { BookmarkService } from "../src/core/bookmarkService";
import { StorageAdapter, BookmarkItem } from "../src/core/types";

class InMemoryStorage implements StorageAdapter {
  constructor(private state: BookmarkItem[] = []) {}

  async getBookmarks(): Promise<BookmarkItem[]> {
    return [...this.state];
  }

  async saveBookmarks(bookmarks: BookmarkItem[]): Promise<void> {
    this.state = [...bookmarks];
  }
}

describe("BookmarkService", () => {
  it("可以新增并按分类查询", async () => {
    const service = new BookmarkService(new InMemoryStorage(), "默认分类");
    await service.add({
      title: "foo.ts",
      uri: "file:///foo.ts",
      line: 1,
      character: 2,
      category: "后端",
      tags: ["api"]
    });

    const all = await service.list();
    expect(all).toHaveLength(1);
    expect(all[0].category).toBe("后端");
    expect(all[0].tags).toEqual(["api"]);
  });

  it("支持按关键字搜索", async () => {
    const service = new BookmarkService(
      new InMemoryStorage([
        {
          id: "1",
          title: "Login Page",
          uri: "file:///src/login.ts",
          line: 1,
          character: 0,
          category: "前端",
          tags: ["auth"],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      ])
    );

    const found = await service.search("auth");
    expect(found).toHaveLength(1);
    expect(found[0].title).toBe("Login Page");
  });

  it("支持修改分类与删除", async () => {
    const storage = new InMemoryStorage([
      {
        id: "1",
        title: "A",
        uri: "file:///a.ts",
        line: 1,
        character: 0,
        category: "旧分类",
        tags: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ]);
    const service = new BookmarkService(storage);

    const updated = await service.updateCategory("1", "新分类");
    expect(updated).toBe(true);

    const afterUpdate = await service.list();
    expect(afterUpdate[0].category).toBe("新分类");

    const removed = await service.remove("1");
    expect(removed).toBe(true);
    expect(await service.list()).toHaveLength(0);
  });
});
