import readline from "readline";
import axios from "axios";
import OpenAI from "openai";
import { generateMartindaleURL } from "./martindale.js";
import { tavilySearch } from "./search.js";

// Initialize the OpenAI client
const client = new OpenAI();

// Global variables
const MAIN_LLM_MODEL = "gpt-4o-mini";
const MAIN_LLM_MODEL_TOKEN_LIMIT = 128_000;

// Define the tools
const tools = [
  {
    type: "function",
    function: {
      name: "generateMartindaleURL",
      description:
        "Generates a URL for the Martindale search engine to find lawyers based on specific search criteria. This tool allows users to provide parameters such as search terms, geographic locations, and areas of legal interest, facilitating tailored and efficient searches.",
      parameters: {
        type: "object",
        properties: {
          term: {
            type: "string",
            description:
              "A keyword or phrase used to refine the lawyer search.",
            example: "real estate",
          },
          geoLocationInputs: {
            type: "array",
            items: { type: "string" },
            description:
              "List of geographic locations (e.g., 'Denver, CO', 'Colorado', etc).",
            example: ["Denver, CO", "Los Angeles, CA"],
          },
          areaInterestInputs: {
            type: "array",
            items: { type: "string" },
            description:
              "List of legal practice areas (e.g., 'Real Estate', 'Divorce', 'Civil Litigation', 'Family Law', 'Wills and Probate', 'Criminal Law', 'Estate Planning', 'Bankruptcy', 'Landlord and Tenant Law', 'Trusts and Estates', 'Immigration', 'Social Security Disability', 'Medical Malpractice', 'Labor and Employment', 'Personal Injury', 'Traffic Violations', 'DUI and DWI', 'General Practice', 'Lottery Law', 'Property Damage', etc).",
            example: [
              "Real Estate",
              "Divorce",
              "Civil Litigation",
              "Family Law",
              "Wills and Probate",
              "Criminal Law",
              "Estate Planning",
              "Bankruptcy",
              "Landlord and Tenant Law",
              "Trusts and Estates",
              "Immigration",
              "Social Security Disability",
              "Medical Malpractice",
              "Labor and Employment",
              "Personal Injury",
              "Traffic Violations",
              "DUI and DWI",
              "General Practice",
              "Lottery Law",
              "Property Damage",
            ],
          },
        },
        required: ["term", "geoLocationInputs"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "tavilySearch",
      description:
        "Performs a search using the Tavily client with customizable options, providing comprehensive results tailored to specified parameters.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query string.",
            example: "Who is Leo Messi?",
          },
          searchDepth: {
            type: "string",
            description: "Determines the thoroughness of the search.",
            enum: ["basic", "advanced"],
            default: "advanced",
          },
          topic: {
            type: "string",
            description:
              "Specifies the category of the search, influencing the search agent used.",
            enum: ["general", "news"],
            default: "general",
          },
          days: {
            type: "number",
            description:
              "Sets the time frame for search results in days. Only applicable for news topic.",
            default: 7,
          },
          maxResults: {
            type: "number",
            description:
              "Limits the maximum number of search results returned.",
            default: 10,
          },
          includeImages: {
            type: "boolean",
            description: "Includes a list of related images.",
            default: true,
          },
          includeImageDescriptions: {
            type: "boolean",
            description:
              "Adds descriptive text for each image when includeImages is true.",
            default: true,
          },
          includeAnswer: {
            type: "boolean",
            description: "Includes a short answer to the query.",
            default: true,
          },
          includeRawContent: {
            type: "boolean",
            description:
              "Includes the cleaned and parsed HTML content of each search result.",
            default: false,
          },
          includeDomains: {
            type: "array",
            items: { type: "string" },
            description:
              "An array of specific domains to include in the search results.",
          },
          excludeDomains: {
            type: "array",
            items: { type: "string" },
            description:
              "An array of specific domains to exclude from the search results.",
          },
          maxTokens: {
            type: "number",
            description: "Sets the maximum number of tokens for the response.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
];

// Dictionary of available functions
const availableFunctions = {
  generateMartindaleURL: generateMartindaleURL,
  tavilySearch: tavilySearch,
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to get user input as a promise
function askQuestion(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function processCompletion(messages, toolCalls = [], responseText = "") {
  try {
    // Send the messages to the model with streaming enabled
    const stream = await client.chat.completions.create({
      model: MAIN_LLM_MODEL,

      messages: messages.map((msg) => ({
        role: msg.role,
        // NOTE: (1-16-2025) convert function response content to string if it's not already
        content:
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content),
        ...(msg.name && { name: msg.name }), // Only include name if it exists
      })),

      tools,
      stream: true,
    });

    // Process the streaming response
    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        responseText += chunk.choices[0].delta.content;
        process.stdout.write(chunk.choices[0].delta.content);
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
          if (toolCall.function?.name)
            tc.function.name += toolCall.function.name;
          if (toolCall.function?.arguments)
            tc.function.arguments += toolCall.function.arguments;
        }
      }
    }

    return { responseText, toolCalls };
  } catch (error) {
    console.error("Error in processCompletion:", error);
    throw error;
  }
}

function estimateTokens(text) {
  // NOTE: this follows the idea of the "Word-based Rule of Thumb". For the GPT models, a common English text, one token generally corresponds to around 3/4 of a word
  // NOTE: this calculation is not accurate but it's good enough. Using tiktoken would be more accurate but it would add massive delays per response
  const wordCount = text.trim().split(/\s+/).length;
  return Math.round(wordCount * 1.33);
}

// TODO: this is not dangerous but it's far from secure, we need to look into using "Browser Geolocation API" instead
async function getLocation() {
  try {
    const response = await axios.get("http://ip-api.com/json/");
    if (response.data.status === "success") {
      const location = response.data;
      const content = {
        city: location.city,
        region: location.region,
        country: location.country,
        // lat: location.lat,
        // lon: location.lon
      };
      return JSON.stringify(content);
    }
  } catch (error) {
    return "?";
  }
}

async function main() {
  const currentUTC = `${new Date().toISOString()} UTC ISO (24-hours)`;
  const location = await getLocation();

  const systemMessage = {
    role: "system",
    content: `You are an AI assistant that helps users find legal resources. When using the Martindale URL generator, always explain what the URL will help them find and provide context about the search results they can expect. Make sure to format the URL as a clickable link and encourage users to review multiple attorneys to find the best fit for their needs. KEEP YOUR ANSWERS SHORT AND TOO THE POINTS. Also NOTE, that use's time is ${currentUTC} and they are located at: ${location}`,
  };

  // Initialize conversation history
  const conversationHistory = [JSON.parse(JSON.stringify(systemMessage))];

  try {
    let toolChatOutput = undefined;

    while (true) {
      // Token management
      if (
        estimateTokens(JSON.stringify(conversationHistory)) >=
        Math.floor(MAIN_LLM_MODEL_TOKEN_LIMIT * 0.85)
      ) {
        while (
          estimateTokens(JSON.stringify(conversationHistory)) >
          MAIN_LLM_MODEL_TOKEN_LIMIT
        ) {
          if (conversationHistory.length > 1) {
            conversationHistory.splice(1, 1);
          } else {
            break;
          }
        }
      }

      let userInput = undefined;
      if (toolChatOutput === undefined) {
        userInput = await askQuestion("You: ");
        console.log();
      } else {
        userInput = toolChatOutput;
        toolChatOutput = undefined;
      }

      // Check for exit command
      if (userInput.toLowerCase() === "exit") {
        console.log("\nGoodbye!");
        break;
      }

      // Add user message to history
      conversationHistory.push({ role: "user", content: userInput });

      // Process initial completion
      const { responseText, toolCalls } =
        await processCompletion(conversationHistory);

      // Add assistant's response to history
      conversationHistory.push({ role: "assistant", content: responseText });

      // If tool calls are detected, execute them
      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          if (functionName in availableFunctions) {
            const functionToCall = availableFunctions[functionName];
            const functionArgs = JSON.parse(toolCall.function.arguments);
            try {
              const functionResponse = await functionToCall(functionArgs);

              // Add function response to history as a string
              conversationHistory.push({
                role: "function",
                name: functionName,
                content: JSON.stringify(functionResponse),
              });

              toolChatOutput = `As the user inputted this: ${userInput} \n\nAnd the following tool was called: ${JSON.stringify(toolCall.function)} \n\nKnowing this, can you review the original user input and answer it again with this given context after the tool calling`;
              continue;
            } catch (e) {
              console.error(`Error executing tool call: ${e}`);
            }
          }
        }
      }

      if (!responseText.endsWith("\n") && responseText.length > 0) {
        console.log("\n");
      }
    }
  } catch (error) {
    console.error("Error in main:", error);
  } finally {
    rl.close();
  }
}

// main function calls
main();
