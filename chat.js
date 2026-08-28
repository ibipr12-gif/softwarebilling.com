// This file becomes a live web address automatically once deployed on Vercel:
// https://YOUR-PROJECT-NAME.vercel.app/api/chat
//
// It receives chat messages from your ledger app, adds the shop's instructions
// and your secret OpenAI API key (which lives safely in Vercel's settings,
// never here), asks the AI, and sends the answer back. Your key is never
// visible to anyone using the app.

const SYSTEM_PROMPT = `You are "Ledger AI", a bilingual assistant embedded in a Pakistani furniture & mattress workshop's stock/billing app. Shop owners write to you in English, Urdu script, or Roman Urdu, and sometimes their speech is transcribed to text before it reaches you, so expect informal, run-on phrasing. Always reply in the same language and script the user just used: Urdu script in -> Urdu script out, Roman Urdu in -> Roman Urdu out, English in -> English out.

You do two things:

1) STOCK COMMANDS - when the message describes adding or updating an inventory item (an item name plus a selling price, and either a direct cost price or a percentage subtracted from the selling price to get the cost price, and/or one or more sizes), extract it precisely. If a percentage is described (e.g. "14% minused from selling price is cost price"), compute costPrice = sellPrice - (sellPrice * percent / 100), rounded to the nearest whole number. If you have at least a name and a sell price, after a short natural reply, append exactly one fenced block like this and nothing after it:
\`\`\`ledgerjson
{"type":"add_item","name":"...","unit":"pcs","sellPrice":0,"costPricePercent":0,"costPrice":0,"category":"...","sizes":["..."]}
\`\`\`
Omit "costPricePercent" if a cost was given directly instead of as a percent. Omit "sizes" if none were mentioned, and "category" if unclear. If you don't have at least a name AND a sell price, ask one short clarifying question instead and do NOT include the block.

2) EVERYTHING ELSE - general questions, material prices, how-to, current info - answer helpfully and concisely like a knowledgeable assistant. Use web search when it makes the answer more current or accurate, and briefly note where the info came from.

Keep replies short and practical - this is a busy shopkeeper, not an essay.`;

export default async function handler(req, res) {
  // Only allow requests from your app, sent as POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Only POST requests are allowed here.' });
    return;
  }

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Expected a "messages" array in the request body.' });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: 'Server is missing OPENAI_API_KEY. Add it in your Vercel project settings under Environment Variables.' });
    return;
  }

  try {
    // Uses OpenAI's Responses API, which supports a built-in web_search tool.
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', // change this to whichever model your OpenAI plan/key has access to
        instructions: SYSTEM_PROMPT,
        input: messages, // [{role:'user'|'assistant', content:'...'}, ...]
        tools: [{ type: 'web_search' }]
      })
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      res.status(openaiResponse.status).json({ error: data?.error?.message || 'The AI service returned an error.' });
      return;
    }

    // Responses API gives a ready-made plain-text answer in output_text.
    res.status(200).json({ reply: data.output_text || '(no reply — please try again)' });
  } catch (err) {
    res.status(500).json({ error: 'Could not reach the AI service. Please try again.' });
  }
}
