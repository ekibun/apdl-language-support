// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import ApdlProvider from './apdlprovider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const APDL_SEL: vscode.DocumentSelector = { scheme: 'file', language: 'apdl' };
	const provider = new ApdlProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.languages.registerDocumentSemanticTokensProvider(
			APDL_SEL, provider, provider.legend
		)
	);
	context.subscriptions.push(provider.diagnotics);
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(
			() => provider.updateConfiguration()
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("ekibun.apdl-language-support.url", (url: string) => {
			provider.onLink(url);
		})
	);
	context.subscriptions.push(
		vscode.languages.registerHoverProvider(
			APDL_SEL, provider,
		)
	);
	context.subscriptions.push(
		vscode.languages.registerSignatureHelpProvider(
			APDL_SEL, provider,
			',', '('
		)
	);
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			APDL_SEL, provider,
			'$', ',', '*', '/'
		)
	);
}

// This method is called when your extension is deactivated
export function deactivate() { }
