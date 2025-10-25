// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Congratulations, your extension "AssistHtec" is now active!');

	 // Register the command 'marija.provideInlineSuggestion'
	//  const inlineCommand = vscode.commands.registerCommand('marija.provideInlineSuggestion', async () => {
    //     const editor = vscode.window.activeTextEditor;
    //     if (!editor) {
    //         vscode.window.showErrorMessage('No active editor found!');
    //         return;
    //     }

    //     const document = editor.document;
    //     const position = editor.selection.active;

    //     // Call the function and apply inline suggestion
    //     const inlineCompletion = await provideInlineSuggestion(document, position);
    //     if (inlineCompletion) {
    //         vscode.window.showInformationMessage('Inline suggestion received!');
    //     } else {
    //         vscode.window.showErrorMessage('No inline suggestion available.');
    //     }
    // });

    // context.subscriptions.push(inlineCommand);

	context.subscriptions.push(
        vscode.languages.registerInlineCompletionItemProvider(
            { pattern: '**' }, // Register for all files
            {
                provideInlineCompletionItems: provideInlineSuggestion
            }
        )
    );

	const disposable = vscode.commands.registerCommand('marija.predictNextCode', () => 
	{

		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const document = editor.document;
			const text = document.getText(); // Sadržaj otvorenog fajla

			// Pozivanje backend funkcionalnosti sa sadržajem fajla
			predictNextCode(text);
		} else {
			vscode.window.showErrorMessage('No active editor found!');
		}
	});

	context.subscriptions.push(disposable);

}

// This method is called when your extension is deactivated
function deactivate() {}

const axios = require('axios');

async function predictNextCode(text) {
	vscode.window.showInformationMessage('Predicting next code for ' + text + ' ...');
    try {
        const response = await axios.post('http://127.0.0.1:8000/predict', null, {
			params: {
				input_text: text
			}
		});

		const predictedText = response.data.predicted_text;

        vscode.window.showInformationMessage('Predicted Text: ' + predictedText);

		// Optionally, inserting the predicted text into the active editor
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const edit = new vscode.WorkspaceEdit();
            const position = editor.selection.active; // Current cursor position
            editor.edit((editBuilder) => {
                editBuilder.insert(position, predictedText);
            });
        }
    } catch (error) {
        vscode.window.showErrorMessage('Error: ' + error.message);
    }
}

async function provideInlineSuggestion(document, position) {
	const text = document.getText(); // Get the entire text of the document
	vscode.window.showInformationMessage('Predicting next code for ' + text + ' ...');
	try {
		// Call backend for prediction
		const response = await axios.post('http://127.0.0.1:8000/predict', null, {
			params: { input_text: text }
		});

		const predictedText = response.data.predicted_text;
		vscode.window.showInformationMessage('Predicted Text: ' + predictedText);

		const completionItem = new vscode.InlineCompletionItem(predictedText, position);

		// Return inline suggestion
		return {items: [completionItem]};
	} catch (error) {
		vscode.window.showErrorMessage('Error: ' + error.message);
		return {items: []}; // Return empty suggestion list in case of error
	}
}

module.exports = {
	activate,
	deactivate
}
