// This file becomes a live web address automatically once deployed on Vercel:
// https://YOUR-PROJECT-NAME.vercel.app/api/chat
//
// Uses Google's Gemini API free tier — no credit card needed.
// Your secret key lives safely in Vercel's settings, never in this file.

const MODEL = 'gemini-3.5-flash-lite';

const SYSTEM_PROMPT = "You are Ledger AI, a bilingual assistant embedded in a Pakistani furniture and mattress workshop's stock/billing app. Shop owners write to you in English, Urdu script, or Roman Urdu, and sometimes their speech is transcribed to text before it reaches you, so expect informal, run-on phrasing. Always reply in the same language and script the user just used: Urdu script in -> Urdu script out, Roman Urdu in -> Roman Urdu out, English in -> English out. " +
"You do two things. " +
"1) STOCK COMMANDS: when the message describes adding or updating an inventory item (an item name plus a selling price, and either a direct cost price or a percentage subtracted from the selling price to get the cost price, and/or one or more sizes), extract it precisely. If a percentage is described, compute costPrice = sellPrice - (sellPrice * percent / 100), rounded to the nearest whole number. If you have at least a name and a sell price, after a short natural reply, append exactly one block starting on its own line with LEDGER_ITEM_JSON_START and ending on its own line with LEDGER_ITEM_JSON_END, containing between those two markers a single line of JSON like this: {\"type\":\"add_item\",\"name\":\"...\",\"unit\":\"pcs\",\"sellPrice\":0,\"costPricePercent\":0,\"costPrice\":0,\"category\":\"...\",\"sizes\":[\"...\"]}. Omit costPricePercent if a cost was given directly instead of as a percent. Omit sizes if none were mentioned, and category if unclear. If you don't have at least a name AND a sell price, ask one short clarifying question instead and do NOT include the block. " +
"2) EVERYTHING ELSE: general questions, material prices, how-to, current info - answer helpfully and concisely like a knowledgeable assistant. Use web search when it makes the answer more current or accurate. " +
"Keep replies short and practical - this is a busy shopkeeper, not an essay.";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Only POST requests are allowed here.' });
    return;
  }

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Expected a "messages" array in the request body.' });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Add it in your Vercel project settings under Environment Variables.' });
    return;
  }

  const contents = messages.map(function (m) {
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    };
  });

  try {
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          tools: [{ google_search: {} }]
        })
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      res.status(geminiResponse.status).json({ error: (data && data.error && data.error.message) || 'The AI service returned an error.' });
      return;
    }

    const candidate = data && data.candidates && data.candidates[0];
    const parts = (candidate && candidate.content && candidate.content.parts) || [];
    let reply = '';
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].text) reply += parts[i].text;
    }
    res.status(200).json({ reply: reply || '(no reply — please try again)' });
  } catch (err) {
    res.status(500).json({ error: 'Could not reach the AI service. Please try again.' });
  }
}
