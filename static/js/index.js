'use strict';

const PERSONA_LABELS = {
  'first-time-reader': 'First-time reader',
  skeptic: 'Skeptic',
  structure: 'Structure',
  accessibility: 'Accessibility',
};

let editorApi = null;
let lastSentText = '';
let lastSentPersona = 'first-time-reader';
let lastResponse = '';

function createFeedbackPanel() {
  const panel = document.createElement('div');
  panel.id = 'llm-panel';
  panel.style.cssText = `
    display: none;
    position: fixed;
    right: 16px;
    top: 60px;
    width: 340px;
    max-height: 520px;
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
      align-items: flex-start;
      padding: 10px 12px;
      border-bottom: 1px solid #eee;
    ">
      <div>
        <div id="llm-panel-persona" style="font-weight: bold;"></div>
        <div id="llm-panel-quote" style="
          font-size: 11px;
          color: #999;
          margin-top: 2px;
          font-style: italic;
        "></div>
      </div>
      <button id="llm-panel-close" style="
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        padding: 0;
        margin-left: 8px;
        flex-shrink: 0;
      ">&#x2715;</button>
    </div>

    <div id="llm-panel-body" style="
      padding: 12px;
      overflow-y: auto;
      flex: 1;
    ">
      <div id="llm-response-text" style="
        color: #333;
        white-space: pre-wrap;
        line-height: 1.6;
      "></div>
    </div>

    <div id="llm-followup-section" style="
      display: none;
      border-top: 1px solid #eee;
      padding: 8px 12px;
      gap: 6px;
      align-items: center;
    ">
      <input id="llm-followup-input" type="text" placeholder="Ask a follow-up\u2026" style="
        flex: 1;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 5px 8px;
        font-size: 12px;
        outline: none;
      " />
      <button id="llm-followup-send" style="
        background: #555;
        color: #fff;
        border: none;
        border-radius: 4px;
        padding: 5px 10px;
        cursor: pointer;
        font-size: 12px;
        flex-shrink: 0;
      ">Ask</button>
    </div>
  `;

  document.body.appendChild(panel);
  return panel;
}

function readCurrentEditorContent() {
  let content = '';

  editorApi.callWithAce((editor) => {
    const editorState = editor.ace_getRep();
    const selectionLength =
      editorState.selEnd[0] !== editorState.selStart[0]
        ? Infinity
        : editorState.selEnd[1] - editorState.selStart[1];
    const selectionIsEmpty = selectionLength <= 1;

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

function buildQuotePreview(text) {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= 60) return `\u201c${singleLine}\u201d`;
  return `\u201c${singleLine.slice(0, 60)}\u2026\u201d`;
}

async function fetchFeedback(requestBody) {
  const response = await fetch('/llm', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  return data.response;
}

async function sendInitialRequest(panel, text, persona) {
  lastSentText = text;
  lastSentPersona = persona;
  lastResponse = '';

  document.getElementById('llm-panel-persona').textContent = PERSONA_LABELS[persona];
  document.getElementById('llm-panel-quote').textContent = buildQuotePreview(text);
  document.getElementById('llm-followup-section').style.display = 'none';

  const responseEl = document.getElementById('llm-response-text');
  panel.style.display = 'flex';
  responseEl.textContent = 'Thinking\u2026';

  try {
    lastResponse = await fetchFeedback({text, persona});
    responseEl.textContent = lastResponse;

    const followupSection = document.getElementById('llm-followup-section');
    followupSection.style.display = 'flex';
    document.getElementById('llm-followup-input').value = '';
  } catch (err) {
    console.error('[ep_llm] request failed:', err);
    responseEl.textContent = 'Error: could not reach the LLM backend.';
  }
}

async function sendFollowUpRequest() {
  const input = document.getElementById('llm-followup-input');
  const followUpQuestion = input.value.trim();
  if (!followUpQuestion) return;

  const responseEl = document.getElementById('llm-response-text');
  responseEl.textContent = 'Thinking\u2026';
  input.value = '';

  try {
    lastResponse = await fetchFeedback({
      text: lastSentText,
      persona: lastSentPersona,
      followUpQuestion,
      previousResponse: lastResponse,
    });
    responseEl.textContent = lastResponse;
  } catch (err) {
    console.error('[ep_llm] follow-up request failed:', err);
    responseEl.textContent = 'Error: could not reach the LLM backend.';
  }
}

exports.postToolbarInit = (_hookName, {ace}) => {
  editorApi = ace;

  const panel = createFeedbackPanel();

  document.getElementById('llm-panel-close').addEventListener('click', () => {
    panel.style.display = 'none';
  });

  const followupSendBtn = document.getElementById('llm-followup-send');
  followupSendBtn.addEventListener('click', sendFollowUpRequest);

  const followupInput = document.getElementById('llm-followup-input');
  followupInput.addEventListener('keydown', (evt) => {
    if (evt.key === 'Enter') sendFollowUpRequest();
  });

  const sendBtn = document.getElementById('llm-send-btn');
  if (!sendBtn) return;

  sendBtn.addEventListener('click', () => {
    const text = readCurrentEditorContent();
    const persona = document.getElementById('llm-persona-select').value;
    sendInitialRequest(panel, text, persona);
  });
};
