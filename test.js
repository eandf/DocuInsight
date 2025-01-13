const util = require("./martindale");

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
        // split by '|', trim whitespace, and filter out empty strings
        inputs.geoLocationInputs = answer
          .split("|")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      } else if (index === 2) {
        // split by '|', trim whitespace, and filter out empty strings
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
  const { term, geoLocationInputs, areaInterestInputs } = inputs;

  const { url, params } = util.generateMartindaleURL(
    term,
    geoLocationInputs,
    areaInterestInputs,
  );

  console.log("\nGenerated URL:");
  console.log(url);
  console.log("\nParameters:");
  console.log(JSON.stringify(params, null, 4));
});
