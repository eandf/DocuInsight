/**
 * Parse the `select` query parameter.
 * Supports:
 *   - comma-separated string (e.g. `?select=id,email`)
 *   - JSON object with 1/0 or true/false (e.g. `?select={"id":1,"email":1}`)
 * Anything else defaults to '*'.
 */
function parseSelect(selectParam) {
  if (!selectParam) return "*";

  try {
    // Try to parse JSON: e.g. {"id":1,"email":1}
    const parsed = JSON.parse(selectParam);
    const columns = Object.keys(parsed).filter((col) => parsed[col]);
    return columns.length ? columns.join(",") : "*";
  } catch {
    // If it's not JSON, assume it's comma-separated: e.g. id,email
    return selectParam;
  }
}

/**
 * Parse the `limit` query parameter. Must be a positive integer.
 */
function parseLimit(limitParam) {
  const limit = parseInt(limitParam, 10);
  return Number.isInteger(limit) && limit > 0 ? limit : null;
}

/**
 * Parse the `query` parameter as JSON:
 *   - e.g. ?query={"email":{"$eq":"bob@example.com"},"age":{"$gt":30}}
 */
function parseQuery(queryParam) {
  if (!queryParam) return {};
  try {
    return JSON.parse(queryParam);
  } catch (err) {
    console.warn("Failed to parse 'query' as JSON:", err);
    return {};
  }
}

/**
 * Apply some common operators:
 *   - $eq, $neq, $lt, $lte, $gt, $gte
 *   - $like, $ilike
 *   - $in  (expects an array)
 *
 * Examples:
 *   { "age": { "$gt": 30 } }            -> .gt("age", 30)
 *   { "email": { "$ilike": "%test%" } } -> .ilike("email", "%test%")
 *   { "id": { "$in": ["1234","abcd"] } }-> .in("id", ["1234","abcd"])
 * If no operator is provided, defaults to .eq(key, value).
 */
function applySupabaseFilters(dbQuery, queryObj) {
  for (const [field, condition] of Object.entries(queryObj)) {
    // If the condition is an object with an operator key, apply the correct filter
    if (
      condition &&
      typeof condition === "object" &&
      !Array.isArray(condition)
    ) {
      const [operator, value] = Object.entries(condition)[0]; // e.g. ["$gt", 30]
      switch (operator) {
        case "$eq":
          dbQuery = dbQuery.eq(field, value);
          break;
        case "$neq":
          dbQuery = dbQuery.neq(field, value);
          break;
        case "$gt":
          dbQuery = dbQuery.gt(field, value);
          break;
        case "$gte":
          dbQuery = dbQuery.gte(field, value);
          break;
        case "$lt":
          dbQuery = dbQuery.lt(field, value);
          break;
        case "$lte":
          dbQuery = dbQuery.lte(field, value);
          break;
        case "$like":
          // For Postgres, "like" is usually case-sensitive
          dbQuery = dbQuery.like(field, value);
          break;
        case "$ilike":
          // iLike is case-insensitive pattern matching in Postgres
          dbQuery = dbQuery.ilike(field, value);
          break;
        case "$in":
          // Expects an array of values
          if (Array.isArray(value)) {
            dbQuery = dbQuery.in(field, value);
          }
          break;
        default:
          // Operator not recognized, ignore or handle error
          console.warn(`Unsupported operator: ${operator}`);
          break;
      }
    } else {
      // No operator object provided: default to eq
      dbQuery = dbQuery.eq(field, condition);
    }
  }
  return dbQuery;
}

// TODO: (1-15-2025) proper authentication needs to be done here with DocuSign!
function userAuth(headers) {
  const authHeader = headers["authorization"];
  return true;
}

// export all functions in utils
export { parseSelect, parseLimit, parseQuery, applySupabaseFilters, userAuth };
