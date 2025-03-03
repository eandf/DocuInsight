// frontend/src/lib/chat.js
import OpenAI from "openai";
import { generateMartindaleURL, tavilySearch } from "@/lib/tools"; // import your tool(s)
import { martindaleToolDescription, searchToolDescription } from "@/lib/tools";

// Define the available tool functions.
const availableFunctions = {
  tavilySearch,
  generateMartindaleURL,
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
function estimateTokens(text) {
  const wordCount = text.trim().split(/\s+/).length;
  return Math.round(wordCount * 1.33);
}

/**
 * Ensure conversation doesn't exceed token limit
 * Removes oldest messages first (except system message)
 */
function manageTokenLimit(sessionId) {
  const conversation = sessionStore[sessionId];
  if (!conversation) return;
  
  // Keep removing messages until we're under 85% of the token limit
  while (
    estimateTokens(JSON.stringify(conversation)) >
    Math.floor(MODEL_TOKEN_LIMIT * 0.85)
  ) {
    if (conversation.length > 1) {
      // Remove the second message (first after system message)
      conversation.splice(1, 1);
    } else {
      break;
    }
  }
}

/**
 * Initializes or retrieves the conversation for a given session.
 */
function getOrInitConversation(sessionId, userLocation, contractText) {
  // Get current UTC time in the requested format
  const now = new Date();
  const utcTime = now.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';
  
  if (!sessionStore[sessionId]) {
    sessionStore[sessionId] = [
      {
        role: "system",
        content: `You are an AI assistant that helps users find legal resources. When using the Martindale URL generator, always explain what the URL will help them find and provide context about the search results they can expect. Make sure to format the URL as a clickable link and encourage users to review multiple attorneys to find the best fit for their needs. KEEP YOUR ANSWERS SHORT AND TOO THE POINT. Also NOTE, the user is located at: ${userLocation}. The current time is: ${utcTime}. The user is getting ready to sign the contract included below. Help answer any questions they may have about the contract.

        NOTES:

        - ANY TIME you include a URL in your response, use markdown to format it as link with anchor text. Make the anchor text short but descriptive.

        CONTRACT TEXT:
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
    content: typeof msg.content === "string" 
      ? msg.content 
      : JSON.stringify(msg.content),
    ...(msg.name && { name: msg.name }),
  }));

  const tools = [
    martindaleToolDescription,
    searchToolDescription,
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
 * It appends the user message, processes the conversation, and then sends the complete response.
 *
 * @param {string} sessionId - The chat session ID.
 * @param {string} userInput - The new message from the user.
 * @param {string|null} userLocation - The user's location.
 * @param {string} contractText - The contract text to include in the context.
 * @param {function} pushChunk - Callback to send the final response to the client.
 */
export async function handleUserMessageStream(
  sessionId,
  userInput,
  userLocation,
  contractText,
  pushChunk
) {
  // Retrieve or initialize conversation history.
  const conversation = getOrInitConversation(
    sessionId,
    userLocation,
    contractText
  );

  // Append the new user message.
  conversation.push({
    role: "user",
    content: userInput,
    visible: true,
  });
  
  // Manage token limit before processing
  manageTokenLimit(sessionId);

  let finalAssistantText = "";

  while (true) {
    const { responseText, toolCalls } = await processOpenAIStream(
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
          
          // Manage token limit after adding tool response
          manageTokenLimit(sessionId);
        } catch (err) {
          console.error("Error executing tool call:", err);
        }
      }
    }
  }

  return finalAssistantText;
}
