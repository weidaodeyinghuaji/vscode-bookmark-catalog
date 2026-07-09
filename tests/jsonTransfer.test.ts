import { describe, expect, it } from "vitest";
import { parseImportPayload, toExportPayload } from "../src/core/jsonTransfer";
import { BookmarkItem } from "../src/core/types";

describe("jsonTransfer", () => {
  it("可导出并解析", () => {
    const data: BookmarkItem[] = [
      {
        id: "1",
        title: "A",
        uri: "file:///a.ts",
        line: 0,
        character: 0,
        category: "默认",
        tags: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ];

    const payload = toExportPayload(data);
    const parsed = parseImportPayload(JSON.stringify(payload));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("1");
  });

  it("非法数据会抛错", () => {
    expect(() => parseImportPayload("{\"version\":2,\"bookmarks\":[]}")).toThrow();
  });
});
