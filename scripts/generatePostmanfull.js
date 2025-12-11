// scripts/generatePostmanFull.js
// CommonJS script: reads .env, signs in to Firebase REST to obtain idToken,
// and generates postman/SmartAppCollection.json + postman/SmartAppEnvironment.json
// Usage: node scripts/generatePostmanFull.js

import fs from "fs";
import path from "path";
import axios from "axios";
import readline from "readline";
import dotenv from "dotenv";
dotenv.config();

const OUT_DIR = path.join(process.cwd(), "postman");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Example image path (the file you uploaded)
const exampleImagePath = "C:\\Users\\zhuji\\OneDrive\\Desktop\\seagull-perched-on-rock-421015772.jpg";
//const exampleImagePath = "/mnt/data/A_diagram_presents_a_relational_database_schema_on.png";

//Prompt helper in case a required value is missing in .env
function ask(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(prompt, (ans) => { rl.close(); resolve(ans); }));
}

async function main() {
  console.log("Smart App — Postman generator (reads .env)\n");

  // Read from .env first, otherwise prompt
  const envBaseUrl = process.env.APP_BASE_URL;
  const envApiKey = process.env.FIREBASE_API_KEY;

  const baseUrl = envBaseUrl || (await ask(`Base URL (APP_BASE_URL) [none]: `));
  const firebaseApiKey = envApiKey || (await ask("Firebase Web API Key (FIREBASE_API_KEY): "));

  // Use the test account credentials you gave
  const TEST_EMAIL = "test.user4@example.it";
  const TEST_PASSWORD = "test123";

  if (!baseUrl || !firebaseApiKey) {
    console.error("\nERROR: Missing APP_BASE_URL or FIREBASE_API_KEY. Put them in .env or provide now.");
    process.exit(1);
  }

  console.log("Signing in to Firebase to obtain idToken (test account)...");
  let idToken = "";
  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`;
    const resp = await axios.post(url, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      returnSecureToken: true
    }, { timeout: 10000 });
    idToken = resp.data.idToken;
    console.log("Obtained idToken (truncated):", idToken ? idToken.slice(0, 30) + "..." : "(empty)");
  } catch (err) {
    console.error("Failed to sign in to Firebase REST API. Check your API key and credentials.");
    console.error(err.response?.data || err.message);
    process.exit(1);
  }

  // Build Postman collection object
  const collection = {
    info: {
      name: "Smart App Backend ",
      description: "Automatically generated Postman collection for Smart App (all endpoints except /auth/verify and /translate).",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    variable: [
      { key: "baseUrl", value: baseUrl },
      { key: "idToken", value: idToken },
      { key: "email", value: TEST_EMAIL },
      { key: "password", value: TEST_PASSWORD },
      { key: "imageId", value: "" },
      { key: "wordId", value: "" },
      { key: "listId", value: "" },
      { key: "sharedCode", value: "" }
    ],
    item: []
  };

  // -------------------AUTH
  // signup 
  collection.item.push({
    name: "Auth: Signup",
    request: {
      method: "POST",
      header: [{ key: "Content-Type", value: "application/json" }],
      body: { mode: "raw", raw: JSON.stringify({ email: "{{email}}", password: "{{password}}", name: "Demo User", preferredLang: "en", avatarId: 2 }) },
      url: { raw: `${baseUrl}/auth/signup`, host: ["{{baseUrl}}"], path: ["auth", "signup"] }
    }
  });

  // login (manual)
  collection.item.push({
    name: "Auth: Login (manual)",
    request: {
      method: "POST",
      header: [{ key: "Content-Type", value: "application/json" }],
      body: { mode: "raw", raw: JSON.stringify({ email: "{{email}}", password: "{{password}}" }) },
      url: { raw: `${baseUrl}/auth/login`, host: ["{{baseUrl}}"], path: ["auth", "login"] }
    },
    event: [{
      listen: "test",
      script: {
        exec: [
          "if (pm.response.code === 200) { try { const json = pm.response.json(); if (json.idToken) pm.collectionVariables.set('idToken', json.idToken); } catch(e){} }"
        ], type: "text/javascript"
      }
    }]
  });

  // get profile
  collection.item.push({
    name: "Auth: Get profile",
    request: {
      method: "GET",
      header: [{ key: "Authorization", value: "Bearer {{idToken}}", type: "text" }],
      url: { raw: `${baseUrl}/auth/profile`, host: ["{{baseUrl}}"], path: ["auth", "profile"] }
    }
  })

  // update profile
  collection.item.push({
    name: "Auth: Update User Profile",
    request: {
      method: "PUT",
      header: [
        { key: "Authorization", value: "Bearer {{idToken}}", type: "text" },
        { key: "Content-Type", value: "application/json" }
      ],
      body: { mode: "raw", raw: JSON.stringify({ displayName: "Updated User", preferredLang: "en", avatarId: 3 }) },
      url: { raw: `${baseUrl}/auth/profile`, host: ["{{baseUrl}}"], path: ["auth", "profile"] }
    }
  })

  // change-password
  collection.item.push({
    name: "Auth: Change Password",
    request: {
      method: "POST",
      header: [
        { key: "Authorization", value: "Bearer {{idToken}}", type: "text" },
        { key: "Content-Type", value: "application/json" }
      ],
      body: { mode: "raw", raw: JSON.stringify({ oldPassword: TEST_PASSWORD, newPassword: "test456" }) },
      url: { raw: `${baseUrl}/auth/change-password`, host: ["{{baseUrl}}"], path: ["auth", "change-password"] }
    }
  });

  // logout
  collection.item.push({
    name: "Auth: Logout",
    request: {
      method: "POST",
      header: [
        { key: "Authorization", value: "Bearer {{idToken}}", type: "text" },
        { key: "Content-Type", value: "application/json" }
      ],
      url: { raw: `${baseUrl}/auth/logout`, host: ["{{baseUrl}}"], path: ["auth", "logout"] }
    },
    event: [{
      listen: "test",
      script: {
        exec: [
          "pm.collectionVariables.set('idToken', '');"
        ], type: "text/javascript"
      }
    }]
  });

  // ----------------------------IMAGES
  // create entry for image
  collection.item.push({
    name: "Images: Store Image",
    request: {
      method: "POST",
      header: [{ key: "Authorization", value: "Bearer {{idToken}}", type: "text" }],
      body: {
        mode: "formdata",
        formdata: [
          { key: "image", type: "file", src: exampleImagePath },
          { key: "objectName", value: "seagull", type: "text" },
          { key: "accuracy", value: "0.95", type: "text" },
          { key: "targetLang", value: "it", type: "text" },
          { key: "x", value: "100", type: "text" },
          { key: "y", value: "150", type: "text" },
          { key: "width", value: "300", type: "text" },
          { key: "height", value: "200", type: "text" }
        ]
      },
      url: { raw: `${baseUrl}/images`, host: ["{{baseUrl}}"], path: ["images"] }
    },
    event: [{
      listen: "test",
      script: {
        exec: [
          "if (pm.response.code === 201 || pm.response.code === 200) { try { const json = pm.response.json(); if (json.image); pm.collectionVariables.set('imageId', json.imageId); } catch(e){} }"
        ], type: "text/javascript"
      }
    }]
  });

  // list images
  /*  collection.item.push({
      name: "images: List images",
      request: {
        method: "GET",
        header: [{ key: "Authorization", value: "Bearer {{idToken}}", type: "text" }],
        url: { raw: `${baseUrl}/images`, host: ["{{baseUrl}}"], path: ["images"] }
      }
    });
  */

  // update image
  collection.item.push({
    name: "images: Update image",
    request: {
      method: "PUT",
      header: [{ key: "Authorization", value: "Bearer {{idToken}}", type: "text" }],
      url: { raw: `${baseUrl}/images/{{imageId}}`, host: ["{{baseUrl}}"], path: ["images", "{{imageId}}"] }
    }
  });

  // fetch a image by id
  collection.item.push({
    name: "images: Get image by Id",
    request: {
      method: "GET",
      header: [{ key: "Authorization", value: "Bearer {{idToken}}", type: "text" }],
      url: { raw: `${baseUrl}/images/{{imageId}}`, host: ["{{baseUrl}}"], path: ["images", "{{imageId}}"] }
    },
    event: [{
      listen: "test",
      script: {
        exec: [
          "if (pm.response.code === 201 || pm.response.code === 200) { try { const json = pm.response.json(); if (json.image); pm.collectionVariables.set('imageId', json.imageId); pm.collectionVariables.set('wordId', json.wordId); } catch(e){} }"
        ], type: "text/javascript"
      }
    }]
  });

  // remove a image by id
  collection.item.push({
    name: "images: Delete image",
    request: {
      method: "DELETE",
      header: [{ key: "Authorization", value: "Bearer {{idToken}}", type: "text" }],
      url: { raw: `${baseUrl}/images/{{imageId}}`, host: ["{{baseUrl}}"], path: ["images", "{{imageId}}"] },
    }
  })

  //--------------------------TRANSLATION
  // translate text
  collection.item.push({
    name: "Translation: Translate Text",
    request: {
      method: "POST",
      header: [
        { key: "Authorization", value: "Bearer {{idToken}}", type: "text" },
        { key: "Content-Type", value: "application/json" }
      ],
      body: {
        mode: "raw",
        raw: JSON.stringify({ originalText: "seagull", targetLang: "it" })
      },
      url: { raw: `${baseUrl}/translate`, host: ["{{baseUrl}}"], path: ["translate"] },
    },
    event: [{
      listen: "test",
      script: {
        exec: [
          "if (pm.response.code === 201 || pm.response.code === 200) { try { const json = pm.response.json(); const word = json.word || json; if (word && word.wordId) pm.collectionVariables.set('wordId', word.wordId); } catch(e){} }"
        ], type: "text/javascript"
      }
    }]
  })

  // -------------------------LISTS
  // create a list
  collection.item.push({
    name: "Lists: Create List",
    request: {
      method: "POST",
      header: [
        { key: "Authorization", value: "Bearer {{idToken}}", type: "text" },
        { key: "Content-Type", value: "application/json" }
      ],
      body: {
        mode: "formdata",
        formdata: [
          { key: "image", type: "file", src: exampleImagePath },
          { key: "listName", value: "my vocab", type: "text" }
        ]
        /*
        mode: "raw",
        raw: JSON.stringify({ listName: "My Vocab" })
        */
      },
      url: { raw: `${baseUrl}/lists`, host: ["{{baseUrl}}"], path: ["lists"] },
    },
    event: [{
      listen: "test",
      script: {
        exec: [
          "if (pm.response.code === 201 || pm.response.code === 200) { try { const json = pm.response.json(); if (json.listId) pm.collectionVariables.set('listId', json.listId); } catch(e){} }"
        ], type: "text/javascript"
      }
    }]
  });

  // list user lists
  collection.item.push({
    name: "Lists: List User Lists",
    request: {
      method: "GET",
      header: [{ key: "Authorization", value: "Bearer {{idToken}}", type: "text" }],
      url: { raw: `${baseUrl}/lists`, host: ["{{baseUrl}}"], path: ["lists"] },
    }
  });

  // fetch a list by id
  collection.item.push({
    name: "Lists: Get List by Id",
    request: {
      method: "GET",
      header: [{ key: "Authorization", value: "Bearer {{idToken}}", type: "text" }],
      url: { raw: `${baseUrl}/lists/{{listId}}/items`, host: ["{{baseUrl}}"], path: ["lists", "{{listId}}", "items"] },
    }
  });

  // add item to list
  /*
  collection.item.push({
    name: "Lists: Add Item to List",
    request: {
      method: "POST",
      header: [
        { key: "Authorization", value: "Bearer {{idToken}}", type: "text" },
        { key: "Content-Type", value: "application/json" }
      ],
      body: { mode: "raw", raw: JSON.stringify({ wordId: "{{wordId}}", imageId: "{{imageId}}" }) },
      url: { raw: `${baseUrl}/lists/{{listId}}/items`, host: ["{{baseUrl}}"], path: ["lists", "{{listId}}", "items"] },
    }
  });
  */

  // add item to multiple lists
  collection.item.push({
    name: "Lists: Add Item to Lists (separated by comma)",
    request: {
      method: "POST",
      header: [
        { key: "Authorization", value: "Bearer {{idToken}}", type: "text" },
        { key: "Content-Type", value: "application/json" }
      ],
      body: {
        mode: "raw", raw: JSON.stringify({ wordId: "{{wordId}}", imageId: "{{imageId}}", listIds: ["{{listId}}"] }),
      },
      url: { raw: `${baseUrl}/lists/items`, host: ["{{baseUrl}}"], path: ["lists", "items"] },
    }
  });

  // update list details
  collection.item.push({
    name: "Lists: Update List",
    request: {
      method: "PUT",
      header: [
        { key: "Authorization", value: "Bearer {{idToken}}", type: "text" },
        { key: "Content-Type", value: "application/json" }
      ],
      body: {
        mode: "formdata",
        formdata: [
          { key: "image", type: "file", src: exampleImagePath },
          { key: "listName", value: "My Vocab Updated", type: "text" },
          //{ key: "removeImage", value: "false", type: "text" }
        ]
        /*
        mode: "raw",
        raw: JSON.stringify({ listName: "My Vocab Updated" })
        */
      },
      url: { raw: `${baseUrl}/lists/{{listId}}`, host: ["{{baseUrl}}"], path: ["lists", "{{listId}}"] },
    }
  });

  // delete an item from a list
  collection.item.push({
    name: "Lists: Delete Item from List",
    request: {
      method: "DELETE",
      header: [{ key: "Authorization", value: "Bearer {{idToken}}", type: "text" }],
      url: { raw: `${baseUrl}/lists/{{listId}}/items/{{wordId}}`, host: ["{{baseUrl}}"], path: ["lists", "{{listId}}", "items", "{{wordId}}"] },
    }
  });

  // delete a list
  collection.item.push({
    name: "Lists: Delete List",
    request: {
      method: "DELETE",
      header: [{ key: "Authorization", value: "Bearer {{idToken}}", type: "text" }],
      url: { raw: `${baseUrl}/lists/{{listId}}`, host: ["{{baseUrl}}"], path: ["lists", "{{listId}}"] },
    }
  })

  // create a shared list
  collection.item.push({
    name: "Lists: Create Share Code",
    request: {
      method: "POST",
      header: [
        { key: "Authorization", value: "Bearer {{idToken}}", type: "text" },
        { key: "Content-Type", value: "application/json" }
      ],
      body: { mode: "raw", raw: JSON.stringify({ listId: "{{listId}}" }) },
      url: { raw: `${baseUrl}/lists/share`, host: ["{{baseUrl}}"], path: ["lists", "share"] }
    },
    event: [{
      listen: "test",
      script: {
        exec: [
          "if (pm.response.code === 201 || pm.response.code === 200) { try { const json = pm.response.json(); if (json.sharedCode) pm.collectionVariables.set('sharedCode', json.sharedCode); } catch(e){} }"
        ], type: "text/javascript"
      }
    }]
  });

  // view the shared list
  collection.item.push({
    name: "Lists: View Shared List",
    request: {
      method: "GET",
      header: [{ key: "Authorization", value: "Bearer {{idToken}}", type: "text" }],
      url: { raw: `${baseUrl}/lists/share/{{sharedCode}}`, host: ["{{baseUrl}}"], path: ["lists", "share", "{{sharedCode}}"] }
    }
  });

  // View the shared list (public, no auth)
  collection.item.push({
    name: "Lists: View Shared List (public)",
    request: {
      method: "GET",
      header: [],
      url: { raw: `${baseUrl}/share/list/{{shareCode}}`, host: ["{{baseUrl}}"], path: ["share", "list", "{{sharedCode}}"] },
    }
  });

  // import the shared list
  collection.item.push({
    name: "Lists: Import Shared List",
    request: {
      method: "POST",
      header: [
        { key: "Authorization", value: "Bearer {{idToken}}", type: "text" },
        { key: "Content-Type", value: "application/json" }
      ],
      body: { mode: "raw", raw: JSON.stringify({ sharedCode: "{{shareCode}}" }) },
      url: { raw: `${baseUrl}/lists/import`, host: ["{{baseUrl}}"], path: ["lists", "import"] }
    }
  });

  // Build environment
  const environment = {
    id: "smart-app-env-" + Date.now(),
    name: "Smart App Auto Environment",
    values: [
      { key: "baseUrl", value: baseUrl, enabled: true },
      { key: "email", value: TEST_EMAIL, enabled: true },
      { key: "password", value: TEST_PASSWORD, enabled: true },
      { key: "firebaseApiKey", value: firebaseApiKey, enabled: true },
      { key: "idToken", value: idToken, enabled: true },
      { key: "imageId", value: "", enabled: true },
      { key: "wordId", value: "", enabled: true },
      { key: "listId", value: "", enabled: true },
      { key: "sharedCode", value: "", enabled: true }
    ]
  };

  // Write files
  const colPath = path.join(OUT_DIR, "SmartAppCollection.json");
  const envPath = path.join(OUT_DIR, "SmartAppEnvironment.json");
  fs.writeFileSync(colPath, JSON.stringify(collection, null, 2));
  fs.writeFileSync(envPath, JSON.stringify(environment, null, 2));

  // README
  const readme = `Smart App — Postman files\n\nFiles created:\n - ${colPath}\n - ${envPath}\n\nImport both into Postman (File -> Import), select the environment, then run the requests.\n\nThe script signed in to Firebase and saved an idToken into the environment variable "idToken". If you want to refresh the token, run the "Auth: Login (manual)" request in Postman (it will update idToken automatically).\n\nExample file used for multipart upload (Create image): ${exampleImagePath}\n`;
  fs.writeFileSync(path.join(OUT_DIR, "README.md"), readme);

  console.log("\nDone. Files written to:", OUT_DIR);
  console.log("Import SmartAppCollection.json and SmartAppEnvironment.json into Postman.");
}

main().catch(err => { console.error(err); process.exit(1); });
