"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownEditorProvider = void 0;
const vscode = require("vscode");
class ConfigurationObject {
    constructor(name, children = []) {
        this.name = name;
        this.children = children;
        this.isStringToArray = false;
    }
    stringToArray() {
        this.isStringToArray = true;
        return this;
    }
    toknizeString(text) {
        if (text === undefined) {
            return [];
        }
        const array = [];
        for (let string of text.split(",")) {
            array.push(string.trim());
        }
        return array;
    }
    getRecord(prefix) {
        let record;
        if (this.children.length === 0) {
            if (this.isStringToArray) {
                record = this.toknizeString(vscode.workspace.getConfiguration(prefix).get(this.name));
            }
            else {
                record = vscode.workspace.getConfiguration(prefix).get(this.name);
            }
        }
        else {
            const childrenRecord = {};
            for (let child of this.children) {
                childrenRecord[child.name] = child.getRecord(prefix + "." + this.name);
            }
            record = childrenRecord;
        }
        return record;
    }
}
class MarkdownEditorProvider {
    constructor(context) {
        this.context = context;
    }
    static register(context) {
        const provider = new MarkdownEditorProvider(context);
        const value = vscode.workspace.getConfiguration('markdownEditor').get('memorySave');
        const providerRegistration = vscode.window.registerCustomEditorProvider(MarkdownEditorProvider.viewType, provider, {
            webviewOptions: { retainContextWhenHidden: !vscode.workspace.getConfiguration('markdownEditor').get('memorySave') }
        });
        return providerRegistration;
    }
    getWebviewContent(scriptUri) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Cat Coding</title>
              <link rel="stylesheet" href="https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.css">
              <script src="https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.js"></script>
            
        </head>
        <body>
          <textarea>
      
          </textarea>

          <script src="${scriptUri}"></script>
        </body>
        </html>`;
    }
    getEditorConfigurations() {
        const configurations = [
            new ConfigurationObject('blockStyles', [
                new ConfigurationObject('bold'),
                new ConfigurationObject('code'),
                new ConfigurationObject('italic')
            ]),
            new ConfigurationObject('showIcons').stringToArray(),
            new ConfigurationObject('indentWithTabs'),
            new ConfigurationObject('lineWrapping'),
            new ConfigurationObject('parsingConfig', [
                new ConfigurationObject('allowAtxHeaderWithoutSpace'),
                new ConfigurationObject('strikethrough'),
                new ConfigurationObject('underscoresBreakWords')
            ]),
            new ConfigurationObject('placeholder'),
            new ConfigurationObject('renderingConfig', [
                new ConfigurationObject('singleLineBreaks'),
                new ConfigurationObject('codeSyntaxHighlighting')
            ]),
            new ConfigurationObject('spellChecker'),
            new ConfigurationObject('styleSelectedText'),
            new ConfigurationObject('tabSize'),
            new ConfigurationObject('toolbarTips')
        ];
        const record = {};
        for (let configuration of configurations) {
            record[configuration.name] = configuration.getRecord('markdownEditor');
        }
        return record;
    }
    resolveCustomTextEditor(document, webviewPanel, _token) {
        return __awaiter(this, void 0, void 0, function* () {
            webviewPanel.webview.options = {
                enableScripts: true
            };
            const scriptUri = webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resource', 'load.js'));
            webviewPanel.webview.html = this.getWebviewContent(scriptUri);
            webviewPanel.webview.onDidReceiveMessage(e => {
                switch (e.type) {
                    case 'save':
                        this.updateTextDocument(document, e.text);
                        return;
                    case 'load':
                        webviewPanel.webview.postMessage({
                            type: 'load',
                            text: document.getText()
                        });
                        return;
                    case 'init':
                        webviewPanel.webview.postMessage({
                            type: 'init',
                            isAutoSaveEnabled: vscode.workspace.getConfiguration('markdownEditor.autoSave').get('enabled'),
                            autosaveDelay: vscode.workspace.getConfiguration('markdownEditor.autoSave').get('delay'),
                            configurations: this.getEditorConfigurations()
                        });
                        return;
                }
            });
        });
    }
    getDocument(document) {
        const text = document.getText();
        if (text.trim().length === 0) {
            return "";
        }
        return text;
    }
    updateTextDocument(document, text) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), text);
        return vscode.workspace.applyEdit(edit);
    }
}
exports.MarkdownEditorProvider = MarkdownEditorProvider;
MarkdownEditorProvider.viewType = 'simplemarkdown';
//# sourceMappingURL=markdownEditor.js.map