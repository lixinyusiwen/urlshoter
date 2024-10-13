// Config object
const config = {
  result_page: false,
  theme: "",
  cors: true,
  unique_link: false,
  custom_link: true,
  overwrite_kv: false,
  snapchat_mode: false,
  visit_count: false,
  load_kv: false,
  system_type: "shorturl",
}

const protect_keylist = ["password"]

// Helper functions
async function randomString(len) {
  len = len || 6;
  let chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
  let maxPos = chars.length;
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return result;
}

async function checkURL(URL) {
  let str = URL;
  let Expression = /http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
  let objExp = new RegExp(Expression);
  return objExp.test(str) && str[0] === 'h';
}

async function save_url(URL, LINKS) {
  let random_key = await randomString();
  let is_exist = await LINKS.get(random_key);
  if (is_exist == null) {
    await LINKS.put(random_key, URL);
    return random_key;
  } else {
    return save_url(URL, LINKS);
  }
}

// Main request handler
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.slice(1);

  console.log(`Handling request for path: ${path}`);

  // Set up response headers
  const response_header = {
    "Content-type": "text/html;charset=UTF-8",
  };

  if (config.cors) {
    response_header["Access-Control-Allow-Origin"] = "*";
    response_header["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    response_header["Access-Control-Allow-Headers"] = "Content-Type";
  }

  // Handle OPTIONS request for CORS
  if (request.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: response_header });
  }

  // Handle API requests
  if (request.method === "POST") {
    console.log("Handling POST request");
    try {
      const req = await request.json();
      const { cmd, url: reqUrl, key, password } = req;

      console.log(`Received command: ${cmd}`);

      const storedPassword = await env.LINKS.get("password");
      if (password !== storedPassword) {
        console.log("Invalid password");
        return new Response(JSON.stringify({ status: 403, error: "Invalid password" }), {
          headers: response_header,
        });
      }

      switch (cmd) {
        case "add":
          console.log("Processing add command");
          if (!await checkURL(reqUrl)) {
            return new Response(JSON.stringify({ status: 400, error: "Invalid URL" }), {
              headers: response_header,
            });
          }
          const shortKey = config.custom_link && key ? key : await save_url(reqUrl, env.LINKS);
          return new Response(JSON.stringify({ status: 200, key: shortKey }), {
            headers: response_header,
          });
        case "del":
          console.log("Processing delete command");
          if (protect_keylist.includes(key)) {
            return new Response(JSON.stringify({ status: 403, error: "Protected key" }), {
              headers: response_header,
            });
          }
          await env.LINKS.delete(key);
          return new Response(JSON.stringify({ status: 200, message: "Deleted successfully" }), {
            headers: response_header,
          });
        case "qry":
          console.log("Processing query command");
          const value = await env.LINKS.get(key);
          if (!value) {
            return new Response(JSON.stringify({ status: 404, error: "Key not found" }), {
              headers: response_header,
            });
          }
          return new Response(JSON.stringify({ status: 200, url: value }), {
            headers: response_header,
          });
        default:
          console.log(`Invalid command: ${cmd}`);
          return new Response(JSON.stringify({ status: 400, error: "Invalid command" }), {
            headers: response_header,
          });
      }
    } catch (error) {
      console.error("Error processing POST request:", error);
      return new Response(JSON.stringify({ status: 500, error: "Server error" }), {
        headers: response_header,
      });
    }
  }

  // Handle GET requests (URL redirection)
  if (request.method === "GET") {
    console.log(`Handling GET request for path: ${path}`);
    try {
      if (!path) {
        return new Response("Welcome to URL Shortener", { headers: response_header });
      }

      const value = await env.LINKS.get(path);
      console.log(`Retrieved value for ${path}: ${value}`);

      if (!value) {
        console.log("Short URL not found");
        return new Response("Short URL not found", { status: 404, headers: response_header });
      }

      if (config.visit_count) {
        const countKey = `${path}-count`;
        let count = await env.LINKS.get(countKey) || "0";
        await env.LINKS.put(countKey, (parseInt(count) + 1).toString());
      }

      if (config.snapchat_mode) {
        await env.LINKS.delete(path);
      }

      console.log(`Redirecting to: ${value}`);
      return Response.redirect(value, 302);
    } catch (error) {
      console.error("Error processing GET request:", error);
      return new Response("Server error", { status: 500, headers: response_header });
    }
  }

  // If we reach here, it's an unsupported request method
  console.log(`Unsupported method: ${request.method}`);
  return new Response("Method Not Allowed", { status: 405, headers: response_header });
}
