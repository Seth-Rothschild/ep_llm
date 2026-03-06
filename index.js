'use strict';

const eejs = require('ep_etherpad-lite/node/eejs/');
const express = require('express');

const PERSONAS = {
  'first-time-reader': `You are a curious first-time reader with no background in this subject.
After reading, respond with 2-4 genuine questions you are left with — things that were unclear,
undefined, or that you wanted to know more about. Do not summarize the text, evaluate it, or
suggest any changes. Only ask what a real reader would actually wonder.`,

  skeptic: `You are a thoughtful skeptic who just read this text. Respond with 2-4 questions you
are left with about the claims, evidence, or assumptions in the text. Do not critique the writing
or identify problems. Only ask what a genuinely skeptical reader would want answered.`,

  structure: `You are a reader thinking about how this text is organized. Respond with 2-4
questions about the shape of the argument — what connects to what, what surprised you about the
order, or where you felt uncertain about where the text was going. Do not evaluate the structure.
Only ask what a reader paying attention to flow would genuinely wonder.`,

  accessibility: `You are a general reader trying to follow this text carefully. Respond with 2-4
questions about places where you slowed down, terms you were not sure about, or sentences that
took more than one reading. Do not suggest simplifications or rewrites. Only ask what a reader
working to understand would actually ask.`,
};

const USER_MESSAGE_PREFIX = 'Please read the following text.\n\n';

function buildInitialUserMessage(text) {
  return USER_MESSAGE_PREFIX + text;
}

function buildConversationMessages(systemPrompt, text, previousResponse, followUpQuestion) {
  return [
    {role: 'system', content: systemPrompt},
    {role: 'user', content: buildInitialUserMessage(text)},
    {role: 'assistant', content: previousResponse},
    {role: 'user', content: followUpQuestion},
  ];
}

function buildInitialMessages(systemPrompt, text) {
  return [
    {role: 'system', content: systemPrompt},
    {role: 'user', content: buildInitialUserMessage(text)},
  ];
}

async function callLLM(messages) {
  const endpoint = process.env.LLM_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
  const apiKey = process.env.LLM_API_KEY || '';
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';

  const requestBody = {model, messages};

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
    const {text, persona, followUpQuestion, previousResponse} = req.body;
    const systemPrompt = PERSONAS[persona] || PERSONAS['first-time-reader'];
    const isFollowUp = Boolean(followUpQuestion && previousResponse);


    const messages = isFollowUp
      ? buildConversationMessages(systemPrompt, text, previousResponse, followUpQuestion)
      : buildInitialMessages(systemPrompt, text);

    try {
      const llmResponse = await callLLM(messages);
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
