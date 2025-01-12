// Written by Mehmet Yilmaz on January 12, 2025

function extractGeoLocation(glfValueInput) {
  const usaStatesAndCities = require("./usa_states_and_cities.json");
  let glfValue = null;

  for (const state in usaStatesAndCities) {
    if (glfValueInput.toLowerCase() === state.toLowerCase()) {
      glfValue = `${state}, U.S.A.`;
      break;
    }
  }

  if (glfValue === null && glfValueInput.includes(",")) {
    let [inputCity, inputStatePov] = glfValueInput.replace(/ /g, "").split(",");
    for (const state in usaStatesAndCities) {
      const statePov = usaStatesAndCities[state].shorten;
      const cities = usaStatesAndCities[state].cities;
      for (const city of cities) {
        if (
          glfValueInput.toLowerCase() === city.toLowerCase() ||
          (inputCity &&
            inputStatePov &&
            inputCity.toLowerCase() === city.toLowerCase() &&
            inputStatePov.toLowerCase() === statePov.toLowerCase())
        ) {
          glfValue = `${city}, ${statePov}`;
          break;
        }
      }
      if (glfValue !== null) break;
    }
  }

  return glfValue;
}

function extractAreaOfInterest(userInput) {
  const areasOfPractice = require("./areas_of_practice.json");
  return (
    areasOfPractice.find(
      (area) => userInput.toLowerCase() === area.toLowerCase(),
    ) || null
  );
}

function gatherUserInputs(callback) {
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const questions = ["Term: ", "Geolocation: ", "Area Of Interest: "];
  const inputs = {};
  let index = 0;

  function askQuestion() {
    readline.question(questions[index], (answer) => {
      if (index === 0) inputs.term = answer;
      if (index === 1) inputs.geoLocationInput = answer;
      if (index === 2) inputs.areaInterestInput = answer;
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
  // get user's inputs
  const { term, geoLocationInput, areaInterestInput } = inputs;

  const glfValue = extractGeoLocation(geoLocationInput);
  const areaInterest = extractAreaOfInterest(areaInterestInput);

  const params = {
    type: "people",
    page: 1,
    limit: 100,
    prOverallScore: ["4to5"],
  };

  if (glfValue !== null) {
    params.geoLocationFacet = [glfValue];
  }
  if (areaInterest !== null) {
    params.practiceAreas = [areaInterest];
  }
  if (term.length > 0) {
    params.term = term;
  }

  const jsonData = JSON.stringify(params);
  const encodedParams = Buffer.from(jsonData).toString("base64");
  const url = `https://www.martindale.com/search/attorneys/?params=${encodedParams}`;

  console.log();
  console.log(url);
  console.log();
  console.log(JSON.stringify(params, null, 4));
});
