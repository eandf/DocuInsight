import { usaStatesAndCities } from "./martindale.js";

const practiceAreas = [
  "personal injury",
  "medical malpractice",
  "criminal law",
  "dui",
  "family law",
  "divorce",
  "bankruptcy",
  "business law",
  "consumer law",
  "employment law",
  "estate planning",
  "foreclosure defense",
  "immigration law",
  "intellectual property",
  "nursing home abuse",
  "probate",
  "products liability",
  "real estate law",
  "tax law",
  "traffic tickets",
  "workers' compensation",
  "agricultural law",
  "animal & dog law",
  "antitrust law",
  "appeals & appellate",
  "arbitration & mediation",
  "asbestos & mesothelioma",
  "cannabis & marijuana law",
  "civil rights",
  "collections",
  "communications & internet law",
  "construction law",
  "domestic violence",
  "education law",
  "elder law",
  "energy, oil & gas law",
  "entertainment & sports law",
  "environmental law",
  "gov & administrative law",
  "health care law",
  "insurance claims",
  "insurance defense",
  "international law",
  "juvenile law",
  "landlord tenant",
  "legal malpractice",
  "maritime law",
  "military law",
  "municipal law",
  "native american law",
  "patents",
  "securities law",
  "social security disability",
  "stockbroker & investment fraud",
  "trademarks",
  "white collar crime",
];

const langs = {
  spanish: 627,
  arabic: 34,
  chinese: 129,
  french: 197,
  german: 213,
  italian: 280,
  japanese: 284,
  korean: 342,
  russian: 563,
};

function generateJustiaURL(
  desiredCity,
  desiredState = undefined,
  desiredLanguage = undefined,
  desiredPracticeArea = undefined,
  rating = undefined,
) {
  let foundState = null;
  let foundCity = null;
  for (let state in usaStatesAndCities) {
    if (desiredState && state.toLowerCase() !== desiredState.toLowerCase()) {
      continue;
    }
    for (let city of usaStatesAndCities[state]["cities"]) {
      if (city.toLowerCase() === desiredCity.toLowerCase()) {
        foundState = state.toLowerCase();
        foundCity = city.toLowerCase();
        break;
      }
    }
    if (foundCity) break;
  }

  let foundedLang = langs[desiredLanguage.toLowerCase()];

  let foundedPracticeArea = undefined;
  if (
    desiredPracticeArea &&
    practiceAreas.includes(desiredPracticeArea.toLowerCase())
  ) {
    foundedPracticeArea = desiredPracticeArea
      .toLocaleLowerCase()
      .replaceAll("&", "")
      .replaceAll(",", "")
      .replace(/\s+/g, " ")
      .replaceAll(" ", "-");
  }

  let url = `https://www.justia.com/lawyers/${foundState}/${foundCity}`;
  if (foundedPracticeArea) {
    url = `https://www.justia.com/lawyers/${foundedPracticeArea}/${foundState}/${foundCity}`;
  }

  let ending = "";
  if (foundedLang) {
    ending += `language=${foundedLang}`;
  }

  if (rating) {
    if (ending.length > 0) {
      ending += "&";
    }
    ending += `rating=${rating}`;
  }

  if (ending.length > 0) {
    url = url + "?" + ending;
  }

  return url;
}

const justiaToolDescription = {
  type: "function",
  function: {
    name: "generateJustiaURL",
    description:
      "Generates a URL for the Justia search engine to locate lawyers. Justia is a legal information platform focusing on free access to legal resources, including Supreme Court opinions and state laws, with a comprehensive lawyer directory. It uses a 1-10 rating scale based on peer reviews. This tool is particularly useful when looking for a wide range of legal information or lawyers with detailed free-access profiles. Justia is ideal for users who prioritize free access to legal resources or who are interested in exploring a broader legal landscape without the associated costs. Compared to Martindale-Hubbell, Justia is better suited for accessing legal information beyond attorney ratings, such as legal research, state laws, and comprehensive practice areas. Use this tool when you need a balance of lawyer search features and access to a vast array of legal resources.",
    parameters: {
      type: "object",
      properties: {
        desiredCity: {
          type: "string",
          description:
            "The city where the lawyer is located. This parameter is mandatory.",
          example: "Denver",
        },
        desiredState: {
          type: "string",
          description: "The state where the lawyer is located. Optional.",
          example: "Colorado",
        },
        desiredLanguage: {
          type: "string",
          description:
            "The language preference for the lawyer. Optional. Supported languages: Spanish, Arabic, Chinese, French, German, Italian, Japanese, Korean, Russian.",
          example: "Spanish",
        },
        desiredPracticeArea: {
          type: "string",
          enum: practiceAreas,
          description:
            "The area of legal practice. Examples include 'Personal Injury', 'Criminal Law', etc. Optional.",
          example: "Elder Law",
        },
        rating: {
          type: "number",
          description: "The Justia rating filter (1-10). Optional.",
          example: 9,
        },
      },
      required: ["desiredCity"],
      additionalProperties: false,
    },
  },
};

export { generateJustiaURL, justiaToolDescription };

// MAIN FUNCTION CALLS

let desiredCity = "Denver";
let desiredState = undefined;
let desiredLanguage = "English";
let desiredPracticeArea = "Elder Law";
let rating = 9;

console.log(
  generateJustiaURL(
    desiredCity,
    desiredState,
    desiredLanguage,
    desiredPracticeArea,
    rating,
  ),
);
