// frontend/src/lib/chat.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateMartindaleURL, tavilySearch } from "@/lib/tools"; // import your tool(s)
import { martindaleToolDescription, searchToolDescription } from "@/lib/tools";

// Define the available tool functions.
const availableFunctions = {
  tavilySearch,
  generateMartindaleURL,
};

// --- Gemini Model Settings ---
const MODEL_NAME = "gemini-2.0-flash";

// In-memory conversation store.
const sessionStore = {};

/**
 * Initializes or retrieves the conversation for a given session.
 */
function getOrInitConversation(sessionId, userLocation, contractText) {
  if (!sessionStore[sessionId]) {
    sessionStore[sessionId] = [
      {
        role: "system",
        content: `You are an AI assistant that helps users find legal resources. When using the Martindale URL generator, always explain what the URL will help them find and provide context about the search results they can expect. Make sure to format the URL as a clickable link and encourage users to review multiple attorneys to find the best fit for their needs. KEEP YOUR ANSWERS SHORT AND TOO THE POINT. Also NOTE, the user is located at: ${userLocation}. The user is getting ready to sign the contract included below. Help answer any questions they may have about the contract.


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

// content: `
// You are an AI assistant that helps users understand their contracts and find legal resources. You also provide general advice when needed, but do not give legal advice. If users request specific legal advice, recommend they consult a lawyer.

// Your tasks include:

// 1. Explaining legal terms and clauses in contracts.
// 2. Providing access to and information from reliable legal sources.
// 3. Sharing the latest legal news and updates, when relevant.
// 4. Always responding in clear, concise markdown format.
// 5. Use descriptive text for any hyperlinks in markdown, rather than displaying the URL itself.

// Keep your answers short and to the point and make sure all your responses are in markdown format, with any links always styled as short descriptive hyperlinks.

// When using the generateMartindaleURL tool, include the returned url in your message. DO NOT modify the URL at all or include any other martindale.com URLs in the message.

// User location: ${userLocation}
// Contract text:
// ${contractText}

// Keep all answers short, to the point, and formatted in markdown.`,

// - If the user is asking for help finding a lawyer that speaks a particular language, use generateJustiaURL instead of generateMartindaleURL

/**
 * Processes the conversation through Gemini.
 * If the response contains a tool call, executes it and re-prompts the model.
 */
async function processGeminiChat(conversation) {
  // Initialize Gemini client and model.
  const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = geminiClient.getGenerativeModel({
    model: MODEL_NAME,
    tools: [
      {
        functionDeclarations: [
          martindaleToolDescription.function,
          searchToolDescription.function,
        ],
      },
    ],
    generationConfig: { temperature: 0.5 },
  });
  const chat = model.startChat();

  let lastResponse = null;
  // Send all conversation messages sequentially.
  for (const msg of conversation) {
    if (msg.role === "function") {
      // For a function message, send it as a function response.
      lastResponse = await chat.sendMessage([
        {
          functionResponse: {
            name: msg.name,
            response: msg.content, // msg.content should be an object (proto Struct)
          },
        },
      ]);
    } else {
      lastResponse = await chat.sendMessage([msg.content]);
    }
  }

  // Inspect the last response for a function call.
  const parts = lastResponse?.response?.candidates?.[0]?.content?.parts || [];
  const functionCallPart = parts.find((part) => part.functionCall);
  if (functionCallPart) {
    const { name, args } = functionCallPart.functionCall;
    if (availableFunctions[name]) {
      console.log(`Calling tool "${name}" with args:`, args);
      let toolResult;
      try {
        toolResult = await availableFunctions[name](args);
        console.log(`Tool "${name}" returned:`, toolResult);
      } catch (error) {
        console.error("Error executing tool call:", error);
        toolResult = { error: "Tool execution failed" };
      }
      // Wrap string results into an object.
      let structuredResult = toolResult;
      if (typeof toolResult === "string") {
        structuredResult = { url: toolResult };
      }
      // Immediately send the function response message.
      const fnRespMsg = await chat.sendMessage([
        {
          functionResponse: {
            name,
            response: structuredResult, // Must be an object with the same number of parts.
          },
        },
      ]);
      // Extract the final assistant answer.
      let finalText = "";
      const parts2 = fnRespMsg?.response?.candidates?.[0]?.content?.parts || [];
      for (const part of parts2) {
        if (part.text) {
          finalText += part.text;
        }
      }
      return finalText;
    } else {
      console.error(`No available function for: ${name}`);
      return "Error: Function not available.";
    }
  } else {
    // No function call in the response; just accumulate text parts.
    let finalText = "";
    for (const part of parts) {
      if (part.text) {
        finalText += part.text;
      }
    }
    return finalText;
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

  // Process conversation with Gemini.
  const finalText = await processGeminiChat(conversation);

  // Append the assistant's final response.
  conversation.push({
    role: "assistant",
    content: finalText,
    visible: true,
  });

  await new Promise((resolve) => {
    let index = 0;
    const chunkSize = 10; // characters per chunk
    const interval = setInterval(() => {
      if (index < finalText.length) {
        pushChunk(finalText.substring(index, index + chunkSize));
        index += chunkSize;
      } else {
        clearInterval(interval);
        console.log();
        resolve();
      }
    }, 50);
  });

  return finalText;
}
