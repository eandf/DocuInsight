const OpenAI = require("openai");
const axios = require("axios");
const cheerio = require("cheerio");

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEP_SEEK_API_KEY,
});

// URL to query
const url =
  "https://www.martindale.com/search/attorneys/?params=eyJ0eXBlIjoicGVvcGxlIiwicGFnZSI6MSwibGltaXQiOjEwMCwicHJPdmVyYWxsU2NvcmUiOlsiNHRvNSJdLCJnZW9Mb2NhdGlvbkZhY2V0IjpbIkRlbnZlciwgQ08iXSwicHJhY3RpY2VBcmVhcyI6WyJCdXNpbmVzcyBMYXciXX0=";

// Headers to mimic a browser
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  Connection: "keep-alive",
};

// Function to fetch and process the HTML
async function fetchAndProcess(url) {
  try {
    // Send GET request using axios
    const response = await axios.get(url, { headers });

    if (response.status !== 200) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Get response data (HTML)
    const html = response.data;

    // Load HTML into cheerio
    const $ = cheerio.load(html);

    // Function to recursively extract text and links
    function extractContent(element) {
      let text = "";

      element.contents().each((i, elem) => {
        if (elem.type === "text") {
          // Append text nodes
          text += $(elem).text();
        } else if (elem.type === "tag") {
          if (elem.name === "a") {
            // Preserve links by formatting them as [text](href)
            const href = $(elem).attr("href");
            const linkText = $(elem).text();

            if (href) {
              // Check if href exists
              // Ensure href is absolute
              const absoluteHref = href.startsWith("http")
                ? href
                : `https://www.martindale.com${href}`;
              text += `[${linkText}](${absoluteHref})`;
            } else {
              // If href is missing, include the link text without hyperlink
              text += linkText;
            }
          } else {
            // For block-level elements, add a newline
            if (
              [
                "p",
                "div",
                "br",
                "ul",
                "ol",
                "li",
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
                "section",
                "article",
              ].includes(elem.name)
            ) {
              text += "\n";
            }
            // Recursively extract content
            text += extractContent($(elem));
          }
        }
      });

      return text;
    }

    // Extract the body content
    const body = $("body");
    const cleanText = extractContent(body);

    // Clean up multiple newlines and trim the text
    const cleanedText = cleanText.replace(/\n\s*\n/g, "\n").trim();

    // Split the text into lines
    const lines = cleanedText.split("\n");

    // Initialize a Set to keep track of unique lines
    const seen = new Set();
    const filteredLines = [];

    for (const line of lines) {
      // Skip lines containing the specific substring
      if (line.includes("https://www.martindale.com/search/attorneys/")) {
        continue;
      }

      if (line.includes("›")) {
        continue;
      }

      // If the line hasn't been seen before, add it to the filtered list
      if (!seen.has(line)) {
        seen.add(line);
        filteredLines.push(line);
      }
      // If the line is a duplicate, skip it
    }

    // Join the filtered lines back into a single string
    const finalText = filteredLines.join("\n");

    let message = `Here is some text containing information about lawyers in my area. Can you convert this into a json? Have it be a list of dicts containing the lawyer's name, links, phone number, address, etc. Here is the raw text: ${finalText}`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: message }],
      model: "deepseek-chat",
    });

    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error fetching and processing the URL:", error.message);
  }
}

// Execute the function
fetchAndProcess(url);
