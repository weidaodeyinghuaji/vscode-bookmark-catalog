export interface BookmarkItem {
  id: string;
  title: string;
  uri: string;
  line: number;
  character: number;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkInput {
  title: string;
  uri: string;
  line: number;
  character: number;
  category?: string;
  tags?: string[];
}

export interface BookmarkExportPayload {
  version: 1;
  exportedAt: string;
  bookmarks: BookmarkItem[];
}

export interface StorageAdapter {
  getBookmarks(): Promise<BookmarkItem[]>;
  saveBookmarks(bookmarks: BookmarkItem[]): Promise<void>;
}
