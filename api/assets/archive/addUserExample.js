import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

async function addUser({ email, name, given_name, family_name, sub }) {
  try {
    // check if the user with the given 'sub' or 'email' already exists
    const { data: existingUser, error: selectError } = await supabase
      .from("users")
      .select("*")
      .or(`sub.eq.${sub},email.eq.${email}`)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      // ignore "not found" error
      console.error("Error checking existing user:", selectError);
      throw selectError;
    }

    if (existingUser) {
      console.log(
        "User with the given sub or email already exists:",
        existingUser,
      );
      return existingUser;
    }

    // add user because they don't exist
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          email,
          name,
          given_name,
          family_name,
          sub,
        },
      ])
      .select("*");

    if (error) {
      console.error("Error inserting user:", error);
      throw error;
    }

    console.log("User added successfully:", data);
    return data;
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

// Example usage
(async () => {
  const newUser = {
    email: "mehmet.mhy@gmail.com",
    name: "Mehmet Yilmaz",
    given_name: "Mehmet",
    family_name: "Yilmaz",
    sub: "4799e5e9-1234-5678-9abc-cf4713bbcacc",
  };

  const result = await addUser(newUser);
  console.log("Result:", result);
})();
