import * as vscode from 'vscode';
import path = require('path');
import fs = require('fs');

// 变量换行又不显示空格
const JOINSTR = ',\u200b';

function getFunctionName(line: string, position: vscode.Position): [string, boolean, string[]] {
  const params: string[] = [];
  let stack = 0;
  let lastComa = position.character;
  for (let i = position.character - 1; i >= 0; --i) {
    switch (line[i]) {
      case ',':
        if (stack <= 0) {
          params.splice(0, 0, line.slice(i + 1, lastComa).trim());
          lastComa = i;
        }
        break;
      case '$':
        if (stack > 0) { return ['', false, params]; }
        const funcName = line.slice(i + 1, lastComa).trim();
        return [funcName, false, params];
      case ')':
        stack += 1;
        break;
      case '(':
        stack -= 1;
        if (stack < 0) {
          params.splice(0, 0, line.slice(i + 1, lastComa).trim());
          const funcName = (/\b([a-z][a-z0-9_]*) *$/i.exec(line.slice(0, i)) ?? [])[1] ?? '';
          return [funcName, true, params];
        }
        break;
    }
  }
  const funcName = line.slice(0, lastComa).trim();
  return [funcName.toUpperCase(), false, params];
}

/**
 * 通过参数返回对应的文档
 * @param info 
 * @param params 
 * @returns 
 */
function getParamDoc(info: Command, params: string[]): [OptionItem | undefined, string[]] {
  const paramIndex = params.length - 1;
  let curParams = [...info.params];
  let cur = info.options ?? {};
  while (true) {
    if (cur.options) {
      const param = params[cur.index ?? -1].toUpperCase();
      const match = cur.options.find((v) => v.match === param);
      if (match && match.next && (match.next.index ?? -1) <= paramIndex) {
        if (match.params) {
          curParams = curParams.slice(0, cur.index!! + 1).concat(match.params);
          curParams[cur.index!!] = params[cur.index!!];
        }
        cur = match.next;
        continue;
      }
    }
    if (cur.next) {
      if (cur.next.index!! > paramIndex) {
        break;
      }
      cur = cur.next;
      continue;
    }
    break;
  }
  if (cur.options && cur.index !== paramIndex) {
    return [undefined, curParams];
  }
  return [cur, curParams];
}

export default class ApdlProvider implements vscode.HoverProvider, vscode.CompletionItemProvider, vscode.SignatureHelpProvider {
  lowerCase: boolean = false;
  baseUrl = './';
  contentUrl: vscode.Uri;
  functions: { [name: string]: Command };
  commands: Command[];

  onLink(url: string) {
    const urlwrap = /^https?:/.test(this.baseUrl) ? vscode.Uri.parse(this.baseUrl + url) : vscode.Uri.file(path.join(this.baseUrl, url.split('#')[0]));
    vscode.env.openExternal(urlwrap);
  }

  constructor(contentUrl: vscode.Uri) {
    this.contentUrl = vscode.Uri.parse(contentUrl.toString() + '/out/');
    this.functions = JSON.parse(fs.readFileSync(this.contentUrl.fsPath + '/functions.json').toString());
    this.commands = JSON.parse(fs.readFileSync(this.contentUrl.fsPath + '/commands.json').toString());
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
    const wordBeginMatch = /(\/|\*)?\w*$/.exec(line.substring(0, position.character));
    const wordEndMatch = /^\w*/.exec(line.substring(position.character));
    const wordBegin = position.character - (wordBeginMatch ? wordBeginMatch[0].length : 0);
    const wordEnd = position.character + (wordEndMatch ? wordEndMatch[0].length : 0);
    if (wordBegin < 0 || wordEnd === wordBegin) {
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
          isFunction ? `${funcName}(${functionInfo.params.join(JOINSTR)})`
            : [funcName, ...functionInfo.params].join(JOINSTR), 'apdl'),
        this.markdown(functionInfo.detail ?? ""),
        this.markdown(`[HELP](${functionInfo.url})`),
      ]);
    } else {
      const [funcName, isFunction, params] = getFunctionName(line, position);
      const functionInfo = this.getFunctionByName(funcName, isFunction, !isFunction);
      if (functionInfo) {
        params[params.length - 1] = name;
        const [doc, _params] = getParamDoc(functionInfo, params);
        if (doc) {
          let detail = doc.detail ?? "";
          let url = functionInfo.url ?? "";
          if (doc.options) {
            const param = name.toUpperCase();
            const match = doc.options.find((v) => v.match === param);
            if (match) {
              detail = (detail + `\n\n**${match.match}** - ${match.detail}`).trim();
              url = match.url ?? url;
            }
          }
          if (_params.length >= params.length) {
            _params[params.length - 1] = `[${_params[params.length - 1]}](a)`;
          }
          return new vscode.Hover([
            this.markdown(detail),
            this.markdown(`[HELP](${url})`),
          ]);
        }
      }

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
          detail: [name, ...v.params].join(JOINSTR),
          documentation: this.markdown(`${v.detail ?? ''}\n\n[HELP](${v.url})`.trim()),
          filterText: commandCheck[1] ? name.replace(/^[\/\*]/, '') : name,
          insertText: commandCheck[1] ? name.replace(/^[\/\*]/, '') : name,
        };
      });
    } else {
      const [name, isFunction, params] = getFunctionName(line, position);
      const ret: vscode.CompletionItem[] = [];
      if (!isFunction) {
        const functionInfo = this.getFunctionByName(name, false, true);
        if (functionInfo) {
          ret.push.apply(ret, (getParamDoc(functionInfo, params)[0]?.options ?? []).map((v) => {
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
      ret.push.apply(ret, Object.entries(this.functions).map(([k, v]) => {
        const name = this.lowerCase ? v.name.toLowerCase() : v.name;
        return {
          label: name,
          kind: vscode.CompletionItemKind.Function,
          detail: `${name}(${v.params.join(JOINSTR)})`,
          documentation: this.markdown(`${v.detail ?? ''}\n\n[HELP](${v.url})`.trim()),
          filterText: name,
          insertText: name,
        };
      }));
      return ret;
    }
  }

  provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.SignatureHelpContext): vscode.ProviderResult<vscode.SignatureHelp> {
    const line = document.lineAt(position.line).text;
    const [name, isFunction, params] = getFunctionName(line, position);
    const paramIndex = params.length - 1;
    const functionInfo = this.getFunctionByName(name, isFunction, !isFunction);
    const ret = new vscode.SignatureHelp();
    if (functionInfo) {
      const funcName = this.lowerCase ? functionInfo.name.toLowerCase() : functionInfo.name;
      const [doc, _params] = getParamDoc(functionInfo, params);
      const parameters = _params?.map((v, i) => i === paramIndex ? v + '\u200c' : v) ?? [];
      ret.activeParameter = paramIndex;
      ret.activeSignature = 0;
      ret.signatures = [
        {
          label: isFunction ? `${funcName}(${parameters.join(JOINSTR)})` : [funcName, ...parameters].join(JOINSTR),
          documentation: this.markdown(`${doc?.detail ?? ''}\n\n[HELP](${functionInfo.url})`.trim()),
          parameters: parameters.map(v => ({
            label: v,
          })),
        }
      ];
    }
    return ret;
  }
}