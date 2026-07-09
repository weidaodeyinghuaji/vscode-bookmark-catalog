import * as vscode from "vscode";
import { BookmarkItem, StorageAdapter } from "../core/types";

const STORAGE_KEY = "bookmarkCatalog.bookmarks";

export class VscodeStorageAdapter implements StorageAdapter {
  constructor(private readonly globalState: vscode.Memento) {}

  async getBookmarks(): Promise<BookmarkItem[]> {
    return this.globalState.get<BookmarkItem[]>(STORAGE_KEY, []);
  }

  async saveBookmarks(bookmarks: BookmarkItem[]): Promise<void> {
    await this.globalState.update(STORAGE_KEY, bookmarks);
  }
}
