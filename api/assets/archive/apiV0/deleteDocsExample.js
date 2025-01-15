import { createClient } from "@supabase/supabase-js";
import readline from "readline";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

async function listDocuments() {
  try {
    const { data: documents, error } = await supabase
      .from("documents")
      .select("*");

    if (error) {
      console.error("Error fetching documents:", error);
      throw error;
    }

    if (!documents || documents.length === 0) {
      console.log("No documents found.");
      return [];
    }

    console.log("\nAll Files/Documents Currently Stored:");
    documents.forEach((doc, index) => {
      console.log(
        `${index + 1}. File Name: ${doc.file_name}, URL: ${doc.document_url}`,
      );
    });

    return documents;
  } catch (err) {
    console.error("Unexpected error while listing documents:", err);
  }
}

async function deleteDocument(doc, deleteFromBucket = true) {
  try {
    // always delete the file from storage
    const { error: storageError } = await supabase.storage
      .from("contracts")
      .remove([doc.file_name]);

    if (storageError) {
      console.error("Error deleting file from storage:", storageError);
      throw storageError;
    }

    console.log(`File "${doc.file_name}" successfully deleted from bucket.`);

    if (deleteFromBucket) {
      // delete the row from the database
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) {
        console.error("Error deleting document from database:", dbError);
        throw dbError;
      }

      console.log(
        `Document "${doc.file_name}" successfully deleted from database.`,
      );
    } else {
      // only update the row in the database to set URL to "null"
      const { error: dbError } = await supabase
        .from("documents")
        .update({ document_url: "null" })
        .eq("id", doc.id);

      if (dbError) {
        console.error("Error updating document in database:", dbError);
        throw dbError;
      }

      console.log(
        `Document "${doc.file_name}" updated in database: URL set to "null".`,
      );
    }
  } catch (err) {
    console.error("Unexpected error while deleting document:", err);
  }
}

async function promptUserSelection(documents) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      "Enter the number of the document you want to manage: ",
      (answer) => {
        rl.close();
        resolve(parseInt(answer, 10) - 1);
      },
    );
  });
}

async function promptDeleteOption() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      "Choose an action:\n1. Delete document from bucket and database\n2. Delete document from bucket only and set URL to 'null' in database\nEnter your choice: ",
      (answer) => {
        rl.close();
        resolve(parseInt(answer, 10));
      },
    );
  });
}

(async () => {
  try {
    const documents = await listDocuments();

    if (!documents || documents.length === 0) {
      console.log("No documents to manage.");
      return;
    }

    const index = await promptUserSelection(documents);
    console.log();

    if (isNaN(index) || index < 0 || index >= documents.length) {
      console.log("Invalid selection. Exiting.");
      return;
    }

    const selectedDocument = documents[index];
    console.log(`You selected: ${selectedDocument.file_name}`);

    const deleteOption = await promptDeleteOption();
    console.log();

    if (deleteOption === 1) {
      await deleteDocument(selectedDocument, true);
    } else if (deleteOption === 2) {
      await deleteDocument(selectedDocument, false);
    } else {
      console.log("Invalid choice. Exiting.");
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
})();
