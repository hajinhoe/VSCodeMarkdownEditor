class MarkdownEditorViewController {
	constructor() {
		this.simplemde = null;
		this.autoSaveDelay = 1000;
		this.pendingAutosave = false;
	}

	postSave(thisObj, vscode, simplemde) {
		if (thisObj.pendingAutosave) {
			return;
		}

		thisObj.pendingAutosave = true;

		setTimeout(() => function () {
			vscode.postMessage({
				type: 'save',
				text: simplemde.value()
			});

			thisObj.pendingAutosave = false;
		}(), thisObj.autoSaveDelay);
	}

	init() {
		// @ts-ignore
		const vscode = acquireVsCodeApi();

		vscode.postMessage({
			type: 'init'
		});

		window.addEventListener('message', event => {
			const message = event.data;
			switch (message.type) {
				case 'load':
					if (this.simplemde === null) {
						return;
					}

					this.simplemde.value(message.text);
					return;
				case 'init':
					// @ts-ignore
					var simplemde = new SimpleMDE(message.configurations);
					simplemde.toggleFullScreen(simplemde);

					if (message.isAutoSaveEnabled) {
						this.autoSaveDelay = message.autosaveDelay;
						simplemde.codemirror.on("change", () => this.postSave(this, vscode, simplemde));
					}

					this.simplemde = simplemde;

					vscode.postMessage({
						type: 'load'
					});
					return;
			}
		});
	}
}

(function () {
	const markdownEditorViewController = new MarkdownEditorViewController();
	markdownEditorViewController.init();
}());