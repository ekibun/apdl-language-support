import * as vscode from 'vscode';
import path = require('path');
import childProcess = require('child_process');
import fs = require('fs');
// import functions = require('./functions.json');
// import commands = require('./commands.json');
// import elements = require('./elements.json');


function getFunctionName(line: string, position: vscode.Position): [string, boolean, number] {
  let paramindex = -1;
  let stack = 0;
  let lastComa = position.character;
  for (let i = position.character - 1; i >= 0; --i) {
    switch (line[i]) {
      case ',':
        if (stack <= 0) {
          paramindex += 1;
          lastComa = i;
        }
        break;
      case '$':
        if (stack > 0) { return ['', false, paramindex]; }
        const funcName = line.slice(i + 1, lastComa);
        return [funcName, false, paramindex];
      case ')':
        stack += 1;
        break;
      case '(':
        stack -= 1;
        if (stack < 0) {
          const funcName = (/([a-z][a-z0-9_]*) *$/i.exec(line.slice(0, i)) ?? [])[1] ?? '';
          return [funcName, true, paramindex + 1];
        }
        break;
    }
  }
  const funcName = line.slice(0, lastComa);
  return [funcName.toUpperCase(), false, paramindex];
}

function getHoverWord(line: string, position: vscode.Position): any[] {
  let wordFlag = false;
  let wordBegin = -1;
  let wordEnd = line.length;
  for (let i = 0; i < line.length; ++i) {
    const char = line[i].toUpperCase();
    switch (char) {
      case '!':
        i = line.indexOf('$', i + 1);
        if (i < 0) {
          return [];
        }
        break;
      case '"':
        i = line.indexOf('"', i + 1);
        if (i < 0) {
          return [];
        }
        break;
      case '\'':
        i = line.indexOf('\'', i + 1);
        if (i < 0) {
          return [];
        }
        break;
      default:
        if (wordFlag) {
          if (!/[A-Z0-9_]/.test(char)) {
            wordFlag = false;
            if (i >= position.character) {
              wordEnd = i;
              return [wordBegin, wordEnd];
            }
          }
        } else if (i <= position.character) {
          if (/[A-Z_\/\*]/.test(char)) {
            wordFlag = true;
            wordBegin = i;
          }
        } else {
          return [];
        }
    }
  }
  return [wordBegin, wordEnd];
}

function getParamDoc(info: Command, paramIndex: number) {
  let cur = info.options ?? {};
  while (cur.next) {
    if (cur.next.index!! > paramIndex) {
      break;
    }
    cur = cur.next;
  }
  return cur;
}

export default class ApdlProvider implements vscode.HoverProvider, vscode.CompletionItemProvider, vscode.SignatureHelpProvider {
  lowerCase: boolean = false;
  baseUrl = './';
  contentUrl: vscode.Uri;
  functions: { [name: string] : Command };
  commands: Command[];
  elements: Command[];

  onLink(url: string) {
    childProcess.exec(`start \"\" \"${path.join(this.baseUrl, url.split('#')[0])}\"`);
  }

  constructor(contentUrl: vscode.Uri) {
    this.contentUrl = vscode.Uri.parse(contentUrl.toString() + '/out/');
    this.functions = JSON.parse(fs.readFileSync(this.contentUrl.fsPath + '/functions.json').toString());
    this.commands = JSON.parse(fs.readFileSync(this.contentUrl.fsPath + '/commands.json').toString());
    this.elements = JSON.parse(fs.readFileSync(this.contentUrl.fsPath + '/elements.json').toString());
    this.updateConfiguration();
  }

  markdown(str: string | undefined) {
    const markdown = new vscode.MarkdownString(str?.replace(/(?<!!)\[([^\]]+)\]\(([^)]+)\)/g, (_, content, url) => {
      return `[${content}](command:ekibun.apdl-language-support.url?${encodeURIComponent(JSON.stringify(url.trim()))})`;
    }));
    markdown.isTrusted = true;
    markdown.baseUri = this.contentUrl;
    markdown.supportHtml = false;
    return markdown;
  }

  updateConfiguration() {
    const config = vscode.workspace.getConfiguration("ekibun.apdl-language-support");
    this.lowerCase = config.get("lowerCase") ?? this.lowerCase;
    this.baseUrl = config.get("baseurl") ?? this.baseUrl;
  }

  private getFunctionByName(name: string, isFunction: boolean, isCommand: boolean): Command | undefined {
    if (isFunction) {
      return (this.functions as { [k: string]: Command })[name.toUpperCase()];
    } else if (isCommand) {
      const abbrMinLen = /^\*|\//.test(name) ? 5 : 4;
      return this.commands.find((v) => name.length >= abbrMinLen ? v.name.startsWith(name) : v.name === name);
    }
  }

  provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
    const line = document.lineAt(position.line).text;
    const [wordBegin, wordEnd] = getHoverWord(line, position);
    if (wordBegin < 0) {
      return;
    }
    const name = line.substring(wordBegin, wordEnd).toUpperCase();
    const isCommand = /(^|\$)\s*$/.test(line.substring(0, wordBegin));
    const isFunction = /^\s*\(/.test(line.substring(wordEnd));
    const functionInfo = this.getFunctionByName(name, isFunction, isCommand);
    if (functionInfo) {
      const funcName = this.lowerCase ? functionInfo.name.toLowerCase() : functionInfo.name;
      return new vscode.Hover([
        new vscode.MarkdownString().appendCodeblock(
          isFunction ? `${funcName}(${functionInfo.params.join(',')})`
            : `${funcName},${functionInfo.params.join(',')}`, 'apdl'),
        this.markdown(functionInfo.detail ?? ""),
        this.markdown(`[HELP](${functionInfo.url})`),
      ]);
    }
  }

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
    const line = document.lineAt(position.line).text;
    const commandCheck = /(?<=^|\$\s*)([\/\*])?([A-Z_][A-Z0-9_]*)?$/i.exec(line.substring(0, position.character));
    if (commandCheck) {
      return this.commands.filter((v) =>
        commandCheck[1] ? v.name.startsWith(commandCheck[1]) : commandCheck[2] ? /^[A-Z_]/i.test(v.name) : true
      ).map((v) => {
        const name = this.lowerCase ? v.name.toLowerCase() : v.name;
        return {
          label: name,
          kind: vscode.CompletionItemKind.Class,
          detail: [name, ...v.params].join(','),
          documentation: this.markdown(`${v.detail}\n\n[HELP](${v.url})`),
          filterText: commandCheck[1] ? name.replace(/^[\/\*]/, '') : name,
          insertText: commandCheck[1] ? name.replace(/^[\/\*]/, '') : name,
        };
      });
    } else {
      const [name, isFunction, paramIndex] = getFunctionName(line, position);
      const ret: vscode.CompletionItem[] = [];
      if (!isFunction) {
        const functionInfo = this.getFunctionByName(name, false, true);
        if (functionInfo) {
          if (functionInfo.name === 'ET' && paramIndex === 1) {
            ret.push.apply(ret, this.elements.map((v) => {
              const name = this.lowerCase ? v.name!!.toLowerCase() : v.name!!;
              return {
                label: name,
                kind: vscode.CompletionItemKind.Enum,
                detail: name,
                documentation: this.markdown(`${v.detail}\n\n[HELP](${v.url})`),
                filterText: name,
                insertText: name,
                sortText: '_' + name,
              };
            }));
          } else {
            ret.push.apply(ret, (getParamDoc(functionInfo, paramIndex)?.options ?? []).map((v) => {
              const name = this.lowerCase ? v.match!.toLowerCase() : v.match!!;
              return {
                label: name,
                kind: vscode.CompletionItemKind.Enum,
                detail: name,
                documentation: this.markdown(v.detail ?? ""),
                filterText: name,
                insertText: name,
                sortText: '_' + name,
              };
            }));
          }
        }
      }
      ret.push.apply(ret, Object.entries(this.functions).map(([k, v]) => {
        const name = this.lowerCase ? v.name.toLowerCase() : v.name;
        return {
          label: name,
          kind: vscode.CompletionItemKind.Function,
          detail: `${name}(${v.params.join(',')})`,
          documentation: this.markdown(`${v.detail}\n\n[HELP](${v.url})`),
          filterText: name,
          insertText: name,
        };
      }));
      return ret;
    }
  }

  provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.SignatureHelpContext): vscode.ProviderResult<vscode.SignatureHelp> {
    const line = document.lineAt(position.line).text;
    const [name, isFunction, paramIndex] = getFunctionName(line, position);
    const functionInfo = this.getFunctionByName(name, isFunction, !isFunction);
    const ret = new vscode.SignatureHelp();
    if (functionInfo) {
      const funcName = this.lowerCase ? functionInfo.name.toLowerCase() : functionInfo.name;
      const parameters = functionInfo.params?.map((v, i) => i === paramIndex ? v + '\u200b' : v) ?? [];
      ret.activeParameter = paramIndex;
      ret.activeSignature = 0;
      ret.signatures = [
        {
          label: isFunction ? `${funcName}(${parameters.join(',')})` : `${funcName},${parameters.join(',')}`,
          documentation: this.markdown(`${getParamDoc(functionInfo, paramIndex)?.detail}\n\n[HELP](${functionInfo.url})`),
          parameters: parameters.map(v => ({
            label: v,
          })),
        }
      ];
    }
    return ret;
  }
}