// Written by Mehmet Yilmaz on January 12, 2025

const usaStatesAndCities = require("./usa_states_and_cities.json");
const areasOfPractice = require("./areas_of_practice.json");

/**
 * Extracts the geolocation in the format "City, StateAbbreviation" or "State, U.S.A."
 * @param {string} glfValueInput - The geolocation input from the user.
 * @returns {string|null} - The formatted geolocation or null if not found.
 */
function extractGeoLocation(glfValueInput) {
  glfValueInput = glfValueInput.trim();

  // Check if input matches a state name or its abbreviation
  for (const state in usaStatesAndCities) {
    const stateNameLower = state.toLowerCase();
    const stateAbbrLower = usaStatesAndCities[state].shorten.toLowerCase();
    const inputLower = glfValueInput.toLowerCase();

    if (inputLower === stateNameLower || inputLower === stateAbbrLower) {
      return `${state}, U.S.A.`;
    }
  }

  // If input contains a comma, assume "City, State" format
  if (glfValueInput.includes(",")) {
    let [inputCity, inputStatePov] = glfValueInput
      .split(",")
      .map((s) => s.trim());

    if (inputCity && inputStatePov) {
      for (const state in usaStatesAndCities) {
        const statePov = usaStatesAndCities[state].shorten.toLowerCase();
        const cities = usaStatesAndCities[state].cities.map((city) =>
          city.toLowerCase(),
        );

        if (
          cities.includes(inputCity.toLowerCase()) &&
          inputStatePov.toLowerCase() === statePov
        ) {
          // Capitalize state abbreviation
          const stateAbbrUpper =
            usaStatesAndCities[state].shorten.toUpperCase();
          // Retrieve original city name casing
          const originalCity = usaStatesAndCities[state].cities.find(
            (city) => city.toLowerCase() === inputCity.toLowerCase(),
          );
          return `${originalCity}, ${stateAbbrUpper}`;
        }
      }
    }
  } else {
    // Assume input is a city only, attempt to find the state
    const inputCityLower = glfValueInput.toLowerCase();
    for (const state in usaStatesAndCities) {
      const cities = usaStatesAndCities[state].cities.map((city) =>
        city.toLowerCase(),
      );
      if (cities.includes(inputCityLower)) {
        const statePov = usaStatesAndCities[state].shorten.toUpperCase();
        // Retrieve original city name casing
        const originalCity = usaStatesAndCities[state].cities.find(
          (city) => city.toLowerCase() === inputCityLower,
        );
        return `${originalCity}, ${statePov}`;
      }
    }
  }

  return null;
}

/**
 * Extracts the area of interest from user input.
 * @param {string} userInput - The area of interest input from the user.
 * @returns {string|null} - The matched area of interest or null if not found.
 */
function extractAreaOfInterest(userInput) {
  userInput = userInput.trim().toLowerCase();
  const matchedArea = areasOfPractice.find(
    (area) => userInput === area.toLowerCase(),
  );
  return matchedArea || null;
}

/**
 * Processes the user inputs to generate the search URL and parameters.
 * @param {string} term - The search term.
 * @param {string[]} geoLocationInputs - Array of geolocation inputs.
 * @param {string[]} areaInterestInputs - Array of area of interest inputs.
 * @returns {object} - An object containing the generated URL and parameters.
 */
function generateMartindaleURL(term, geoLocationInputs, areaInterestInputs) {
  // Process geolocations
  const glfValues = geoLocationInputs
    .map((input) => extractGeoLocation(input))
    .filter((value) => value !== null);

  // Process areas of interest
  const areaInterests = areaInterestInputs
    .map((input) => extractAreaOfInterest(input))
    .filter((value) => value !== null);

  const params = {
    type: "people",
    page: 1,
    limit: 25,
    prOverallScore: ["4to5"],
  };

  if (glfValues.length > 0) {
    params.geoLocationFacet = glfValues;
  }
  if (areaInterests.length > 0) {
    params.practiceAreas = areaInterests;
  }
  if (term.length > 0) {
    params.term = term;
  }

  const jsonData = JSON.stringify(params);
  const encodedParams = Buffer.from(jsonData).toString("base64");
  const url = `https://www.martindale.com/search/attorneys/?params=${encodedParams}`;

  return { url, params };
}

/**
 * Gathers user inputs for term, geolocations, and areas of interest.
 * Allows multiple geolocations and areas of interest separated by '|'.
 * @param {function} callback - The callback function to handle the inputs.
 */
function gatherUserInputs(callback) {
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const questions = [
    "Term: ",
    "Geolocations (separated by '|'): ",
    "Areas Of Interest (separated by '|'): ",
  ];
  const inputs = {};
  let index = 0;

  function askQuestion() {
    readline.question(questions[index], (answer) => {
      if (index === 0) {
        inputs.term = answer.trim();
      } else if (index === 1) {
        // Split by '|', trim whitespace, and filter out empty strings
        inputs.geoLocationInputs = answer
          .split("|")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      } else if (index === 2) {
        // Split by '|', trim whitespace, and filter out empty strings
        inputs.areaInterestInputs = answer
          .split("|")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
      index++;
      if (index < questions.length) {
        askQuestion();
      } else {
        readline.close();
        callback(inputs);
      }
    });
  }

  askQuestion();
}

// MAIN FUNCTION CALLS

gatherUserInputs((inputs) => {
  // Destructure user inputs
  const { term, geoLocationInputs, areaInterestInputs } = inputs;

  // Call the main processing function
  const { url, params } = generateMartindaleURL(
    term,
    geoLocationInputs,
    areaInterestInputs,
  );

  console.log("\nGenerated URL:");
  console.log(url);
  console.log("\nParameters:");
  console.log(JSON.stringify(params, null, 4));
});
