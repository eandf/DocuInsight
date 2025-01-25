import OpenAI from "openai";

import {
  generateMartindaleURL,
  generateJustiaURL,
  tavilySearch,
  martindaleToolDescription,
  justiaToolDescription,
  searchToolDescription,
} from "./tools.js";

// --- PRICING/CONFIG ---

const MAIN_LLM_MODEL = "gpt-4o-mini";
const MAIN_LLM_MODEL_TOKEN_LIMIT = 128_000;
const ENABLE_USAGE_LOGIC = false;

const client = new OpenAI();

/**
 * An in-memory store of conversations.
 * Key = sessionId (string), value = array of {role, content, visible?, name?}
 */
const sessionStore = {};

const tools = [
  martindaleToolDescription,
  searchToolDescription,
  justiaToolDescription,
];

const availableFunctions = {
  generateMartindaleURL,
  tavilySearch,
  generateJustiaURL,
};

/** Approximate token usage (word-based) */
function estimateTokens(text) {
  const wordCount = text.trim().split(/\s+/).length;
  return Math.round(wordCount * 1.33);
}

/** Ensure we don't exceed 85% of token limit */
function manageTokenLimit(sessionId) {
  const conversation = sessionStore[sessionId];
  if (!conversation) return;
  while (
    estimateTokens(JSON.stringify(conversation)) >
    Math.floor(MAIN_LLM_MODEL_TOKEN_LIMIT * 0.85)
  ) {
    if (conversation.length > 1) {
      conversation.splice(1, 1); // remove earliest non-system message
    } else {
      break;
    }
  }
}

/**
 * Retrieves or initializes the conversation for a given sessionId.
 * We start with a hidden system message if none exists.
 */
function getOrInitConversation(sessionId) {
  if (!sessionStore[sessionId]) {
    sessionStore[sessionId] = [
      {
        role: "system",
        content: `You are an AI assistant that helps users find legal resources.
                  When using the Martindale URL generator, always explain what the URL will help them find
                  and provide context about the search results they can expect.
                  Make sure to format the URL as a clickable link
                  and encourage users to review multiple attorneys
                  to find the best fit for their needs.
                  KEEP YOUR ANSWERS SHORT AND TO THE POINTS.`,
        visible: false,
      },
    ];
  }
  return sessionStore[sessionId];
}

/**
 * Calls OpenAI with streaming turned on, reading partial data as it arrives.
 *
 * @param {*} conversation An array of messages
 * @param {*} onToken A callback that receives partial text as each token arrives
 * @returns {Promise<{responseText: string, toolCalls: any[]}>}
 */
async function processCompletionStream(conversation, onToken) {
  // Convert our conversation to OpenAI’s format
  const openAIMessages = conversation.map((msg) => ({
    role: msg.role,
    content:
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content),
    ...(msg.name && { name: msg.name }),
  }));

  const modelCallParams = {
    model: MAIN_LLM_MODEL,
    messages: openAIMessages,
    tools,
    stream: true,
  };

  if (ENABLE_USAGE_LOGIC) {
    modelCallParams["stream_options"] = { include_usage: true };
  }

  let responseText = "";
  const toolCalls = [];

  const stream = await client.chat.completions.create(modelCallParams);
  try {
    for await (const chunk of stream) {
      if (chunk.usage) {
        totalInputTokens += chunk.usage.prompt_tokens || 0;
        totalOutputTokens += chunk.usage.completion_tokens || 0;
      }

      if (chunk.choices[0]?.delta?.content) {
        const partial = chunk.choices[0].delta.content;
        responseText += partial;

        onToken(partial);
      }

      if (chunk.choices[0]?.delta?.tool_calls) {
        const deltaToolCalls = chunk.choices[0].delta.tool_calls;
        for (const toolCall of deltaToolCalls) {
          if (toolCalls.length <= toolCall.index) {
            toolCalls.push({
              id: "",
              type: "function",
              function: { name: "", arguments: "" },
            });
          }
          const tc = toolCalls[toolCall.index];
          if (toolCall.id) tc.id += toolCall.id;
          if (toolCall.function?.name) {
            tc.function.name += toolCall.function.name;
          }
          if (toolCall.function?.arguments) {
            tc.function.arguments += toolCall.function.arguments;
          }
        }
      }
    }
    return { responseText, toolCalls };
  } catch (err) {
    console.error("Error streaming from OpenAI:", err);
    throw err;
  }
}

/**
 * handleUserMessageStream(sessionId, userInput, pushChunk)
 *
 * - Called once per new user message.
 * - We append the user’s message to the conversation.
 * - We do an OpenAI streaming pass. As tokens arrive, we call `pushChunk(...)` to send them to the client.
 * - If the response triggers a function call, we:
 *    1) Stop streaming further from that pass (it's over).
 *    2) Execute the function call.
 *    3) Re-run the model with a hidden user message describing the tool result.
 *    4) Stream that second pass, also chunk by chunk to the client (continuing the same stream).
 *    5) Repeat if multiple function calls occur.
 * - Return once no more function calls are requested.
 */
export async function handleUserMessageStream(sessionId, userInput, pushChunk) {
  const conversation = getOrInitConversation(sessionId);

  conversation.push({
    role: "user",
    content: userInput,
    visible: true,
  });

  manageTokenLimit(sessionId);

  let finalAssistantText = "";

  while (true) {
    const { responseText, toolCalls } = await processCompletionStream(
      conversation,
      (partial) => {
        pushChunk(partial);
      }
    );

    finalAssistantText = responseText;

    conversation.push({
      role: "assistant",
      content: responseText,
      visible: true,
    });

    if (!toolCalls || toolCalls.length === 0) {
      break;
    }

    for (const call of toolCalls) {
      const fnName = call.function.name.trim();
      if (availableFunctions[fnName]) {
        try {
          const parsedArgs = JSON.parse(call.function.arguments);
          const result = await availableFunctions[fnName](parsedArgs);

          conversation.push({
            role: "function",
            name: fnName,
            content: JSON.stringify(result),
            visible: false,
          });

          const metaPrompt = `
            As the user input was: ${userInput}
            And the tool called was: ${JSON.stringify(call.function)}
            Here is the tool response: ${JSON.stringify(result)}
            Now provide the final answer to the user,
            considering the tool's result.
          `;

          conversation.push({
            role: "user",
            content: metaPrompt,
            visible: false,
          });
        } catch (err) {
          console.error("Error executing tool call:", err);
        }
      }
    }
  }

  return finalAssistantText;
}
