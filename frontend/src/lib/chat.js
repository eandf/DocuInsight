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

function estimateTokens(text) {
  const wordCount = text.trim().split(/\s+/).length;
  return Math.round(wordCount * 1.33);
}

function manageTokenLimit(sessionId) {
  const conversationHistory = sessionStore[sessionId];
  if (!conversationHistory) return;

  while (
    estimateTokens(JSON.stringify(conversationHistory)) >
    Math.floor(MAIN_LLM_MODEL_TOKEN_LIMIT * 0.85)
  ) {
    if (conversationHistory.length > 1) {
      conversationHistory.splice(1, 1);
    } else {
      break;
    }
  }
}

async function processCompletion(sessionId, messages) {
  const openAIMessages = messages.map((msg) => ({
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
        responseText += chunk.choices[0].delta.content;
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
    console.error("Error in processCompletion streaming:", err);
    throw err;
  }
}

function getOrInitConversation(sessionId) {
  if (!sessionStore[sessionId]) {
    sessionStore[sessionId] = [
      {
        role: "system",
        content: `You are an AI assistant that helps users find legal resources.
                  When using the Martindale URL generator, always explain what the URL will help them find
                  and provide context about the search results they can expect.
                  Make sure to format the URL as a clickable link and encourage users to review multiple attorneys
                  to find the best fit for their needs.
                  KEEP YOUR ANSWERS SHORT AND TO THE POINTS.`,
        visible: false,
      },
    ];
  }
  return sessionStore[sessionId];
}

export async function handleUserMessage(sessionId, userInput) {
  const conversationHistory = getOrInitConversation(sessionId);

  conversationHistory.push({
    role: "user",
    content: userInput,
    visible: true,
  });

  manageTokenLimit(sessionId);

  let { responseText, toolCalls } = await processCompletion(
    sessionId,
    conversationHistory
  );

  conversationHistory.push({
    role: "assistant",
    content: responseText,
    visible: true,
  });

  while (toolCalls.length > 0) {
    console.log(`>>> CALLING TOOL(S):`);
    for (let entry of toolCalls) {
      console.log(
        `=> ${entry["function"]["name"]} : ${entry["function"]["arguments"]}`
      );
    }
    console.log();

    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name.trim();
      if (functionName in availableFunctions) {
        const functionToCall = availableFunctions[functionName];
        const functionArgs = JSON.parse(toolCall.function.arguments);

        try {
          const functionResponse = await functionToCall(functionArgs);

          conversationHistory.push({
            role: "function",
            name: functionName,
            content: JSON.stringify(functionResponse),
            visible: false,
          });

          const toolChatOutput = `As the user input was: ${userInput}
                                  And the tool called was: ${JSON.stringify(
                                    toolCall.function
                                  )}
                                  Here is the tool response: ${JSON.stringify(
                                    functionResponse
                                  )}
                                  Now provide the final answer to the user,
                                  considering the tool's result.`;

          conversationHistory.push({
            role: "user",
            content: toolChatOutput,
            visible: false,
          });

          const reRun = await processCompletion(sessionId, conversationHistory);
          responseText = reRun.responseText;
          toolCalls = reRun.toolCalls;

          conversationHistory.push({
            role: "assistant",
            content: responseText,
            visible: true,
          });
        } catch (err) {
          console.error(`Error executing tool call: ${err}`);
        }
      }
    }
  }

  return responseText;
}
