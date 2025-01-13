const OpenAI = require("openai");
const readline = require("readline");
const martindale = require("./martindale");

// Initialize the OpenAI client
const client = new OpenAI();

// Global variables
const MAIN_LLM_MODEL = "gpt-4o-mini";

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
            description: "List of geographic locations (e.g., 'Denver, CO').",
            example: ["Denver, CO", "Los Angeles, CA"],
          },
          areaInterestInputs: {
            type: "array",
            items: { type: "string" },
            description: "List of legal practice areas (e.g., 'Real Estate').",
            example: martindale.areasOfPractice,
          },
        },
        required: ["term", "geoLocationInputs"],
        additionalProperties: false,
      },
    },
  },
];

// Dictionary of available functions
const availableFunctions = {
  generateMartindaleURL: martindale.generateMartindaleURL,
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
      messages,
      tools,
      tool_choice: "auto", // Explicitly enable tool choice
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

async function main() {
  // Initialize conversation history with updated system message
  const conversationHistory = [
    {
      role: "system",
      content:
        "You are an AI assistant that helps users find legal resources. When using the Martindale URL generator, always explain what the URL will help them find and provide context about the search results they can expect. Make sure to format the URL as a clickable link and encourage users to review multiple attorneys to find the best fit for their needs.",
    },
  ];

  console.log(
    'Legal Resource Assistant initialized. Type "exit" to end the conversation.\n',
  );

  try {
    while (true) {
      // Get user input
      const userInput = await askQuestion("You: ");

      // Check for exit command
      if (userInput.toLowerCase() === "exit") {
        console.log("\nGoodbye!");
        break;
      }

      // Add user message to history
      conversationHistory.push({ role: "user", content: userInput });

      // Process initial completion with tool_choice enabled
      const stream = await client.chat.completions.create({
        model: MAIN_LLM_MODEL,
        messages: conversationHistory,
        tools,
        tool_choice: "auto", // Explicitly enable tool choice
        stream: true,
      });

      let responseText = "";
      let toolCalls = [];

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

      // Add assistant's response to history
      if (responseText) {
        conversationHistory.push({ role: "assistant", content: responseText });
      }

      // If tool calls are detected, execute them
      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          if (functionName in availableFunctions) {
            const functionToCall = availableFunctions[functionName];
            const functionArgs = JSON.parse(toolCall.function.arguments);
            try {
              // Call the function and get the response
              const functionResponse = functionToCall(functionArgs);

              // Add function response to history with better formatting
              conversationHistory.push({
                role: "function",
                name: functionName,
                content: `Generated Search URL: ${functionResponse}`,
              });

              // Get final response after function call
              const { responseText: finalResponse } =
                await processCompletion(conversationHistory);

              if (finalResponse) {
                console.log("\n" + finalResponse);

                // Add final response to history
                conversationHistory.push({
                  role: "assistant",
                  content: finalResponse,
                });
              }
            } catch (e) {
              console.error(`Error executing tool call: ${e}`);
            }
          }
        }
      }

      console.log("\n"); // Add spacing between interactions
    }
  } catch (error) {
    console.error("Error in main:", error);
  } finally {
    rl.close();
  }
}

// main function calls
main();
