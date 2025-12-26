const vscode = require('vscode');
const axios = require('axios');

const ENDPOINT_DEFAULT = 'http://127.0.0.1:8000/predict';
const SEP = '\n<<<SUFFIX>>>\n';
const MAX_CONTEXT = 60000;
const HEAD_BUDGET = 20000;
const TAIL_BUDGET = 40000;


function clampContext(head, tail) {
	// Ensure total length under MAX_CONTEXT by trimming head first
	const total = head.length + tail.length;
	if (total <= MAX_CONTEXT) return { head, tail };
	const overflow = total - MAX_CONTEXT;
	if (head.length > overflow) {
	return { head: head.slice(overflow), tail };
	}
	// Head fully trimmed, trim the rest from tail
	return { head: '', tail: tail.slice(overflow - head.length) };
}

// ---- de-dup / throttle / epoch guards ----
const MIN_INTERVAL_MS = 150; // lagani throttle
let lastCall = {
  key: null,            // docUri@version@offset
  payloadHash: null,    // hash head+SEP+tail
  ts: 0,                // last timestamp
};
let inFlight = new Map(); // key -> {controller, epoch}

function makeKey(document, position) {
  const uri = document.uri.toString();
  const ver = document.version; // VS Code bumps on edits
  const off = document.offsetAt(position);
  return `${uri}@${ver}@${off}`;
}

function hashPayload(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h >>> 0;
}


const provider = {
	async provideInlineCompletionItems(document, position, context, token) {
		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.document !== document) return;


		const endpoint = vscode.workspace.getConfiguration('assisthtec').get('endpoint')
		|| ENDPOINT_DEFAULT;


		const fullText = document.getText();
		const cursorOffset = document.offsetAt(position);


		let head = fullText.slice(Math.max(0, cursorOffset - HEAD_BUDGET), cursorOffset);
		let tail = fullText.slice(cursorOffset, Math.min(fullText.length, cursorOffset + TAIL_BUDGET));
		({ head, tail } = clampContext(head, tail));


		const payload = head + SEP + tail;
		//updateStatus('$(sync~spin) AssistHTEC', 'Requesting suggestion...');
  		console.log('[AssistHTEC] Calling API...');

		// Wire VS Code cancellation into the HTTP call
		const controller = new AbortController();
		token.onCancellationRequested(() => controller.abort());


		try {
			const res = await axios.post(endpoint, payload, {
			headers: { 'Content-Type': 'text/plain' },
			timeout: 15000,
			signal: controller.signal, // axios@1 supports AbortController
			});


			const predicted = typeof res.data === 'string'
			? res.data
			: (res.data?.predicted_text ?? '');
			// 🔹 signal success
			//updateStatus('$(rocket) AssistHTEC', 'Suggestion received!');
			console.log('[AssistHTEC] Suggestion OK, length:', predicted?.length ?? 0);


			if (!predicted || !predicted.trim()) return;


			// Return as a single inline completion item at the cursor position
			const range = new vscode.Range(position, position);
			const item = new vscode.InlineCompletionItem(predicted, range);
			return new vscode.InlineCompletionList([item]);
		} catch (e) {
		// Swallow cancellations quietly; show other errors once per doc
		//updateStatus('$(alert) AssistHTEC', `Error calling API: ${e.message}`, '#f14c4c');
    	console.error('[AssistHTEC] API call failed:', e.message);
		if (!token.isCancellationRequested) {
		console.debug('AssistHtec inline error:', e.message);
		}
		return; // no completions
		}
	},
};

function activate(context) {
	console.log('AssistHtec inline extension activated');


	// Register the inline completion provider for all languages
	const selector = { pattern: '**' };
	const disposableProvider = vscode.languages.registerInlineCompletionItemProvider(selector, provider);
	context.subscriptions.push(disposableProvider);


	// Optional: a command to manually trigger inline suggestions
	const trigger = vscode.commands.registerCommand('assisthtec.triggerInline', async () => {
	await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
	});
	context.subscriptions.push(trigger);
}

// function activate(context) {
//   console.log('AssistHtec inline extension activated');

//   const disposable = vscode.commands.registerCommand('assisthtec.predictNextCode', async () => {
//     const editor = vscode.window.activeTextEditor;
//     if (!editor) {
//       vscode.window.showErrorMessage('No active editor found!');
//       return;
//     }

//     const text = editor.document.getText();
//     const endpoint = vscode.workspace.getConfiguration('assisthtec').get('endpoint')
//       || 'http://127.0.0.1:8000/predict';

//     try {
//       const res = await axios.post(endpoint, text, {
//         headers: { 'Content-Type': 'text/plain' },
//         timeout: 20000
//       });

//       const predicted = typeof res.data === 'string' ? res.data : (res.data?.predicted_text ?? '');
//       await editor.edit(eb => eb.insert(editor.selection.active, predicted));
//     } catch (e) {
//       vscode.window.showErrorMessage(`AssistHtec API error: ${e.message}`);
//     }
//   });

//   context.subscriptions.push(disposable);
// }

function deactivate() {}

module.exports = { activate, deactivate };