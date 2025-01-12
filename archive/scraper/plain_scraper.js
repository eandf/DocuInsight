// fetchAndProcess.js

const axios = require("axios");
const cheerio = require("cheerio");

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
    const finalText = cleanText.replace(/\n\s*\n/g, "\n").trim();

    console.log(finalText);
  } catch (error) {
    console.error("Error fetching and processing the URL:", error.message);
  }
}

// Execute the function
fetchAndProcess(url);
