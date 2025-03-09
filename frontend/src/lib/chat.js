import OpenAI from "openai";

import {
  generateMartindaleURL,
  tavilySearch,
  externalWebScraper,
  parseAndAnalyzeTheContract,
} from "@/lib/tools";
import {
  martindaleToolDescription,
  searchToolDescription,
  externalWebScraperToolDescription,
  parseAndAnalyzeToolDescription,
} from "@/lib/tools";

const availableFunctions = {
  tavilySearch,
  generateMartindaleURL,
  externalWebScraper,
  parseAndAnalyzeTheContract,
};

// --- OpenAI Model Settings ---
const MODEL_NAME = "gpt-4o-mini";
const MODEL_TOKEN_LIMIT = 128_000;

// In-memory conversation store.
const sessionStore = {};

/**
 * Estimate token count based on text length
 * This is a rough approximation - 1 token is roughly 4 characters or 3/4 of a word
 */
function estimateTokens(text, rounding = 1.15, language = null) {
  const wordCount = text.split(/\s+/).length;

  // https://gptforwork.com/guides/openai-gpt3-tokens
  const tokenMultiplier = {
    english: 1.3,
    french: 2.0,
    german: 2.1,
    spanish: 2.1,
    chinese: 2.5,
    russian: 3.3,
    vietnamese: 3.3,
    arabic: 4.0,
    hindi: 6.4,
  };

  if (language) {
    language = language.toLowerCase();
  }

  let multiplier;
  if (!language || !tokenMultiplier[language]) {
    const sortedMultipliers = Object.values(tokenMultiplier).sort(
      (a, b) => a - b,
    );
    multiplier = sortedMultipliers[Math.floor(sortedMultipliers.length / 2)];
  } else {
    multiplier = tokenMultiplier[language];
  }

  return Math.floor(wordCount * multiplier * rounding);
}

/**
 * Ensure conversation doesn't exceed token limit.
 * Removes oldest messages first (except the main system prompt)
 * until we're under 75% of the token limit.
 */
function manageTokenLimit(sessionId) {
  const conversation = sessionStore[sessionId];
  if (!conversation) return;

  // Keep removing messages until we're under 75% of the token limit
  while (
    estimateTokens(JSON.stringify(conversation)) >
    Math.floor(MODEL_TOKEN_LIMIT * 0.75)
  ) {
    // Always keep the very first system message
    if (conversation.length > 1) {
      conversation.splice(1, 1);
    } else {
      break;
    }
  }
}

/**
 * Initializes or retrieves the conversation for a given session.
 * We store a refined system prompt as the first message,
 * then add the contract text as a second system message (so it can be removed if needed).
 */
function getOrInitConversation(
  sessionId,
  userLocation,
  contractText,
  finalReport,
) {
  // Get current UTC time in the requested format
  const now = new Date();
  const utcTime = now.toISOString().replace("T", " ").substring(0, 16) + " UTC";

  if (!sessionStore[sessionId]) {
    sessionStore[sessionId] = [
      {
        role: "system",
        content: `
You are an AI assistant that helps users understand a contract they are signing. Provide short, concise answers to clarify the contract. If helpful, you may guide users to legal resources or attorneys without revealing any internal tools or steps. When including a link, use a concise, descriptive Markdown link. The user is located at: ${userLocation}. The current time is: ${utcTime}. You have access to a final report for additional context:

FINAL REPORT:
${finalReport}`,
        visible: false,
      },
      {
        // Add the contract text as a separate system message so it can be removed if necessary
        role: "system",
        content: `CONTRACT TEXT:
${contractText}`,
        visible: false,
      },
    ];
  }
  return sessionStore[sessionId];
}

/**
 * Processes the conversation through OpenAI with streaming.
 */
async function processOpenAIStream(conversation, onToken) {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Convert conversation to OpenAI's format
  const openAIMessages = conversation.map((msg) => ({
    role: msg.role,
    content:
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content),
    ...(msg.name && { name: msg.name }),
  }));

  // Define the tools we can use in the background.
  const tools = [
    martindaleToolDescription,
    searchToolDescription,
    externalWebScraperToolDescription,
    parseAndAnalyzeToolDescription,
  ];

  let responseText = "";
  const toolCalls = [];

  try {
    const stream = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: openAIMessages,
      tools,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        const partial = chunk.choices[0].delta.content;
        responseText += partial;
        onToken(partial);
      }

      // Tool calls are captured here but not revealed to user
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
 * Main function called by your API route.
 * It appends the user message, processes the conversation,
 * handles any tool calls, and then sends the complete response.
 *
 * @param {string} sessionId - The chat session ID.
 * @param {string} userInput - The new message from the user.
 * @param {string|null} userLocation - The user's location.
 * @param {string} contractText - The contract text to include in the context.
 * @param {function} pushChunk - Callback to send the partial response to the client.
 */
export async function handleUserMessageStream(
  sessionId,
  userInput,
  userLocation,
  contractText,
  finalReport,
  pushChunk,
) {
  // Retrieve or initialize conversation history.
  const conversation = getOrInitConversation(
    sessionId,
    userLocation,
    contractText,
    finalReport,
  );

  // Append the new user message.
  conversation.push({
    role: "user",
    content: userInput,
    visible: true,
  });

  // Manage token usage before processing
  manageTokenLimit(sessionId);

  let finalAssistantText = "";

  while (true) {
    const { responseText, toolCalls } = await processOpenAIStream(
      conversation,
      (partial) => {
        pushChunk(partial);
      },
    );

    finalAssistantText = responseText;

    // Store the assistant's response
    conversation.push({
      role: "assistant",
      content: responseText,
      visible: true,
    });

    // If no tool calls, we're done
    if (!toolCalls || toolCalls.length === 0) {
      break;
    }

    // Handle each tool call in the background
    for (const call of toolCalls) {
      const fnName = call.function.name.trim();
      if (availableFunctions[fnName]) {
        try {
          let parsedArgs = JSON.parse(call.function.arguments);
          
          if (fnName === "parseAndAnalyzeTheContract") {
            parsedArgs["contract"] = contractText
          }

          // // Execute the tool function
          // console.log(`Calling tool ${fnName}(${JSON.stringify(parsedArgs)})`)
          const result = await availableFunctions[fnName](parsedArgs);
          // console.log("Tool call's output:", result)

          // Add the tool's response as a function role message (not visible to the user)
          conversation.push({
            role: "function",
            name: fnName,
            content: JSON.stringify(result),
            visible: false,
          });

          // Provide a refined meta prompt to incorporate tool data seamlessly
          const metaPrompt = `
The user previously said: "${userInput}".
You have received relevant background data from an external source: ${JSON.stringify(result)}.
Incorporate this data seamlessly and provide a final answer to the user.
Do not mention or reveal the external source or that any tool was used.
Keep your answers short and concise.
          `;

          // This message is not visible to the user; it instructs the model how to integrate the tool data
          conversation.push({
            role: "user",
            content: metaPrompt,
            visible: false,
          });

          // Manage token usage again after adding tool response
          manageTokenLimit(sessionId);
        } catch (err) {
          console.error("Error executing tool call:", err);
        }
      }
    }
  }

  return finalAssistantText;
}
