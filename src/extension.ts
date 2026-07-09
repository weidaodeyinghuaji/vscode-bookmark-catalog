import * as vscode from "vscode";
import { BookmarkService } from "./core/bookmarkService";
import { parseImportPayload, toExportPayload } from "./core/jsonTransfer";
import { BookmarkItem } from "./core/types";
import { VscodeStorageAdapter } from "./infra/vscodeStorage";
import { BookmarkTreeProvider } from "./ui/bookmarkTreeProvider";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const defaultCategory = vscode.workspace
    .getConfiguration("bookmarkCatalog")
    .get<string>("defaultCategory", "默认");
  const service = new BookmarkService(new VscodeStorageAdapter(context.globalState), defaultCategory);
  const treeProvider = new BookmarkTreeProvider();
  const treeView = vscode.window.createTreeView("bookmarkCatalog.view", { treeDataProvider: treeProvider });
  context.subscriptions.push(treeView);

  await refreshTree(service, treeProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand("bookmarkCatalog.refreshTree", () => refreshTree(service, treeProvider)),
    vscode.commands.registerCommand("bookmarkCatalog.addBookmark", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("请先打开一个文件并定位到目标行。");
        return;
      }

      const title = await vscode.window.showInputBox({
        prompt: "输入收藏标题",
        value: editor.document.fileName.split(/[/\\]/).pop() ?? "未命名收藏"
      });
      if (!title) {
        return;
      }

      const category = await vscode.window.showInputBox({
        prompt: "输入分类（可留空使用默认分类）",
        value: defaultCategory
      });

      const tagsRaw = await vscode.window.showInputBox({
        prompt: "输入标签，多个标签使用逗号分隔（可选）"
      });

      const bookmark = await service.add({
        title,
        category,
        uri: editor.document.uri.toString(),
        line: editor.selection.active.line,
        character: editor.selection.active.character,
        tags: tagsRaw ? tagsRaw.split(",") : []
      });
      await refreshTree(service, treeProvider);
      vscode.window.showInformationMessage(`已添加收藏：${bookmark.title}`);
    }),
    vscode.commands.registerCommand("bookmarkCatalog.searchBookmarks", async () => {
      const keyword = await vscode.window.showInputBox({
        prompt: "输入关键字（支持标题/分类/路径/标签）"
      });
      if (keyword === undefined) {
        return;
      }

      const result = await service.search(keyword);
      if (result.length === 0) {
        vscode.window.showInformationMessage("未匹配到收藏记录。");
        return;
      }

      const selected = await vscode.window.showQuickPick(
        result.map((item) => toQuickPick(item)),
        { placeHolder: "选择收藏并跳转" }
      );
      if (!selected) {
        return;
      }

      await openBookmark(selected.data);
    }),
    vscode.commands.registerCommand("bookmarkCatalog.manageBookmarks", async () => {
      const all = await service.list();
      if (all.length === 0) {
        vscode.window.showInformationMessage("当前没有收藏记录。");
        return;
      }

      const picked = await vscode.window.showQuickPick(
        all.map((item) => toQuickPick(item)),
        { placeHolder: "选择要管理的收藏" }
      );
      if (!picked) {
        return;
      }

      const action = await vscode.window.showQuickPick(["打开", "删除", "修改分类"], {
        placeHolder: "选择操作"
      });
      if (!action) {
        return;
      }

      if (action === "打开") {
        await openBookmark(picked.data);
        return;
      }
      if (action === "删除") {
        await service.remove(picked.data.id);
      } else {
        const nextCategory = await vscode.window.showInputBox({
          prompt: "输入新的分类名称",
          value: picked.data.category
        });
        if (!nextCategory) {
          return;
        }
        await service.updateCategory(picked.data.id, nextCategory);
      }
      await refreshTree(service, treeProvider);
    }),
    vscode.commands.registerCommand("bookmarkCatalog.exportBookmarks", async () => {
      const fileUri = await vscode.window.showSaveDialog({
        filters: { JSON: ["json"] },
        saveLabel: "导出收藏"
      });
      if (!fileUri) {
        return;
      }
      const bookmarks = await service.list();
      const payload = toExportPayload(bookmarks);
      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(JSON.stringify(payload, null, 2), "utf8"));
      vscode.window.showInformationMessage(`导出完成：${bookmarks.length} 条`);
    }),
    vscode.commands.registerCommand("bookmarkCatalog.importBookmarks", async () => {
      const fileUri = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { JSON: ["json"] },
        openLabel: "导入收藏"
      });
      if (!fileUri || fileUri.length === 0) {
        return;
      }

      try {
        const buf = await vscode.workspace.fs.readFile(fileUri[0]);
        const content = Buffer.from(buf).toString("utf8");
        const bookmarks = parseImportPayload(content);
        await service.replaceAll(bookmarks);
        await refreshTree(service, treeProvider);
        vscode.window.showInformationMessage(`导入完成：${bookmarks.length} 条`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        vscode.window.showErrorMessage(`导入失败：${message}`);
      }
    })
  );
}

export function deactivate(): void {}

async function refreshTree(service: BookmarkService, provider: BookmarkTreeProvider): Promise<void> {
  const all = await service.list();
  provider.setData(all);
}

async function openBookmark(item: BookmarkItem): Promise<void> {
  const uri = vscode.Uri.parse(item.uri);
  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc, {
    preview: false
  });
  const position = new vscode.Position(item.line, item.character);
  editor.selection = new vscode.Selection(position, position);
  editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
}

function toQuickPick(item: BookmarkItem): vscode.QuickPickItem & { data: BookmarkItem } {
  return {
    label: item.title,
    description: `[${item.category}] ${item.uri}`,
    detail: `Ln ${item.line + 1}, Col ${item.character + 1}; tags: ${item.tags.join(", ") || "-"}`,
    data: item
  };
}
