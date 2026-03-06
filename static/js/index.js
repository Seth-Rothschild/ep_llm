'use strict';

let editorApi = null;

function createFeedbackPanel() {
  const panel = document.createElement('div');
  panel.id = 'llm-panel';
  panel.style.cssText = `
    display: none;
    position: fixed;
    right: 16px;
    top: 60px;
    width: 320px;
    max-height: 480px;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    font-family: sans-serif;
    font-size: 13px;
    flex-direction: column;
  `;

  panel.innerHTML = `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      border-bottom: 1px solid #eee;
      font-weight: bold;
    ">
      <span>LLM Feedback</span>
      <button id="llm-panel-close" style="
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
      ">&#x2715;</button>
    </div>
    <div style="padding: 12px; overflow-y: auto; flex: 1;">
      <span id="llm-response-text" style="
        color: #555;
        white-space: pre-wrap;
        line-height: 1.5;
      ">Highlight text and click SEND to get feedback.</span>
    </div>
  `;

  document.body.appendChild(panel);
  return panel;
}

function readCurrentEditorContent() {
  let content = '';

  editorApi.callWithAce((editor) => {
    const editorState = editor.ace_getRep();
    const selectionIsEmpty =
      editorState.selStart[0] === editorState.selEnd[0] &&
      editorState.selStart[1] === editorState.selEnd[1];

    if (selectionIsEmpty) {
      content = editorState.alltext;
    } else {
      content = extractSelectionText(editorState);
    }
  }, 'llm-read-content', true);

  return content;
}

function extractSelectionText(editorState) {
  const [startLine, startChar] = editorState.selStart;
  const [endLine, endChar] = editorState.selEnd;

  if (startLine === endLine) {
    return editorState.lines.atIndex(startLine).text.slice(startChar, endChar);
  }

  const lines = [];
  lines.push(editorState.lines.atIndex(startLine).text.slice(startChar));
  for (let i = startLine + 1; i < endLine; i++) {
    lines.push(editorState.lines.atIndex(i).text);
  }
  lines.push(editorState.lines.atIndex(endLine).text.slice(0, endChar));
  return lines.join('\n');
}

exports.postToolbarInit = (_hookName, {ace}) => {
  editorApi = ace;

  const panel = createFeedbackPanel();

  document.getElementById('llm-panel-close').addEventListener('click', () => {
    panel.style.display = 'none';
  });

  const sendBtn = document.getElementById('llm-send-btn');
  if (!sendBtn) return;

  sendBtn.addEventListener('click', async () => {
    const text = readCurrentEditorContent();

    const responseEl = document.getElementById('llm-response-text');
    panel.style.display = 'flex';
    responseEl.textContent = 'Thinking\u2026';

    try {
      const response = await fetch('/llm', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text}),
      });

      const data = await response.json();
      console.log('[ep_llm] response:', data.response);
      responseEl.textContent = data.response;
    } catch (err) {
      console.error('[ep_llm] request failed:', err);
      responseEl.textContent = 'Error: could not reach the LLM backend.';
    }
  });
};
