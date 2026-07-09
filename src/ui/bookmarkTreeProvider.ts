import * as vscode from "vscode";
import { BookmarkItem } from "../core/types";

export class BookmarkTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private groups: CategoryNode[] = [];

  setData(bookmarks: BookmarkItem[]): void {
    const map = new Map<string, BookmarkItem[]>();
    for (const item of bookmarks) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }

    this.groups = [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "zh-Hans-CN"))
      .map(([category, items]) => ({
        type: "category",
        id: `cat-${category}`,
        category,
        children: [...items].sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"))
      }));
    this._onDidChangeTreeData.fire(undefined);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    if (element.type === "category") {
      const node = new vscode.TreeItem(element.category, vscode.TreeItemCollapsibleState.Expanded);
      node.contextValue = "bookmarkCategory";
      node.description = `${element.children.length} 项`;
      return node;
    }

    const lineLabel = `Ln ${element.bookmark.line + 1}, Col ${element.bookmark.character + 1}`;
    const item = new vscode.TreeItem(element.bookmark.title, vscode.TreeItemCollapsibleState.None);
    item.description = lineLabel;
    item.tooltip = `${element.bookmark.uri}\n${lineLabel}`;
    item.command = {
      command: "vscode.open",
      title: "打开收藏",
      arguments: [
        vscode.Uri.parse(element.bookmark.uri),
        { selection: new vscode.Range(element.bookmark.line, element.bookmark.character, element.bookmark.line, element.bookmark.character) }
      ]
    };
    item.contextValue = "bookmarkItem";
    return item;
  }

  getChildren(element?: TreeNode): Thenable<TreeNode[]> {
    if (!element) {
      return Promise.resolve(this.groups);
    }
    if (element.type === "category") {
      return Promise.resolve(
        element.children.map((bookmark) => ({
          type: "bookmark" as const,
          id: bookmark.id,
          bookmark
        }))
      );
    }
    return Promise.resolve([]);
  }
}

interface CategoryNode {
  type: "category";
  id: string;
  category: string;
  children: BookmarkItem[];
}

interface BookmarkNode {
  type: "bookmark";
  id: string;
  bookmark: BookmarkItem;
}

export type TreeNode = CategoryNode | BookmarkNode;
