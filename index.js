'use strict';

const eejs = require('ep_etherpad-lite/node/eejs/');
const express = require('express');

const SYSTEM_PROMPT =
  'You are a writing assistant. Give concise, constructive feedback on the provided text.';

const PROMPT_PREFIX = 'Please review this text and provide feedback.\n\n';

function buildUserMessage(documentText) {
  return PROMPT_PREFIX + documentText;
}

async function callLLM(userMessage) {
  const endpoint = process.env.LLM_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
  const apiKey = process.env.LLM_API_KEY || '';
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';

  const requestBody = {
    model,
    messages: [
      {role: 'system', content: SYSTEM_PROMPT},
      {role: 'user', content: userMessage},
    ],
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LLM API returned ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

exports.expressPreSession = async (hookName, {app}) => {
  app.post('/llm', express.json(), async (req, res) => {
    const text = req.body && req.body.text;
    console.log('[ep_llm] received text:', text);

    const userMessage = buildUserMessage(text);

    try {
      const llmResponse = await callLLM(userMessage);
      res.json({response: llmResponse});
    } catch (err) {
      console.error('[ep_llm] LLM call failed:', err.message);
      res.status(500).json({error: err.message});
    }
  });
};

exports.eejsBlock_editbarMenuLeft = (hook, args, cb) => {
  args.content += eejs.require('ep_llm/templates/editbarButtons.ejs');
  return cb();
};
