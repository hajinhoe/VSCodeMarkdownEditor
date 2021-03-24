import { time } from 'node:console';
import * as vscode from 'vscode';

class ConfigurationObject {
  name: string;
  children: Array<ConfigurationObject>;
  isStringToArray: Boolean;

  public constructor(name: string, children: Array<ConfigurationObject> = []) {
    this.name = name;
    this.children = children;
    this.isStringToArray = false;
  }

  public stringToArray(): ConfigurationObject {
    this.isStringToArray = true;
    return this;
  }

  public toknizeString(text?: string): Array<string> {
    if (text === undefined) {
      return [];
    }

    const array: Array<string> = [];

    for (let string of text.split(",")) {
      array.push(string.trim());
    }

    return array;
  }

  public getRecord(prefix: string): any {
    let record: any;

    if (this.children.length === 0) {
      if (this.isStringToArray) {
        record = this.toknizeString(vscode.workspace.getConfiguration(prefix).get(this.name));
      } else {
        record = vscode.workspace.getConfiguration(prefix).get(this.name);
      }
    } else {
      const childrenRecord: Record<any, any> = {};
      for (let child of this.children) {
        childrenRecord[child.name] = child.getRecord(prefix + "." + this.name);
      }
      record = childrenRecord;
    }

    return record;
  }
}

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MarkdownEditorProvider(context);
    const value = vscode.workspace.getConfiguration('markdownEditor').get('memorySave');
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      MarkdownEditorProvider.viewType,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: !vscode.workspace.getConfiguration('markdownEditor').get('memorySave') }
      });
    return providerRegistration;
  }

  private static readonly viewType = 'simplemarkdown';

  constructor(
    private readonly context: vscode.ExtensionContext
  ) { }

  private getWebviewContent(scriptUri: vscode.Uri) {
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


  private getEditorConfigurations(): Record<any, any> {
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

    const record: Record<any, any> = {};

    for (let configuration of configurations) {
      record[configuration.name] = configuration.getRecord('markdownEditor');
    }

    return record;
  }

  public async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
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
  }

  private getDocument(document: vscode.TextDocument): string {
    const text = document.getText();
    if (text.trim().length === 0) {
      return "";
    }
    return text;
  }

  private updateTextDocument(document: vscode.TextDocument, text: string) {
    const edit = new vscode.WorkspaceEdit();

    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      text);

    return vscode.workspace.applyEdit(edit);
  }
}