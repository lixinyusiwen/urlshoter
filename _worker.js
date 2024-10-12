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

function base64ToBlob(base64String) {
  const parts = base64String.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

// Main request handler
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.slice(1);

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
    return new Response(null, { headers: response_header });
  }

  // Handle API requests
  if (request.method === "POST") {
    try {
      const req = await request.json();
      const { cmd, url: reqUrl, key, password } = req;

      const storedPassword = await env.LINKS.get("password");
      if (password !== storedPassword) {
        return new Response(JSON.stringify({ status: 500, key: "", error: "Error: Invalid password." }), {
          headers: response_header,
        });
      }

      switch (cmd) {
        case "add":
          // Implement add logic
          break;
        case "del":
          // Implement delete logic
          break;
        case "qry":
          // Implement query logic
          break;
        case "qryall":
          // Implement query all logic
          break;
        default:
          return new Response(JSON.stringify({ status: 400, error: "Invalid command" }), {
            headers: response_header,
          });
      }
    } catch (error) {
      return new Response(JSON.stringify({ status: 500, error: "Server error" }), {
        headers: response_header,
      });
    }
  }

  // Handle GET requests (URL redirection)
  if (request.method === "GET") {
    if (!path) {
      return Response.redirect("https://github.com/yourusername/your-repo", 302);
    }

    const value = await env.LINKS.get(path);

    if (!value || protect_keylist.includes(path)) {
      return new Response("404 Not Found", { status: 404, headers: response_header });
    }

    if (config.visit_count) {
      let count = await env.LINKS.get(path + "-count") || "0";
      await env.LINKS.put(path + "-count", (parseInt(count) + 1).toString());
    }

    if (config.snapchat_mode) {
      await env.LINKS.delete(path);
    }

    let finalUrl = value;
    if (url.search) {
      finalUrl += url.search;
    }

    if (config.system_type === "shorturl") {
      return Response.redirect(finalUrl, 302);
    } else if (config.system_type === "imghost") {
      const blob = base64ToBlob(value);
      return new Response(blob, { headers: { "Content-Type": blob.type } });
    } else {
      return new Response(value, {
        headers: { "Content-type": "text/plain;charset=UTF-8" },
      });
    }
  }

  // If we reach here, it's an unsupported request method
  return new Response("Method Not Allowed", { status: 405, headers: response_header });
}
