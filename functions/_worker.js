// Config object and helper functions remain the same
// ...

const welcome_html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>URL Shortener</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>Welcome to URL Shortener</h1>
    <p>This is a simple URL shortening service.</p>
    <p>To use the API, send POST requests to this URL with the following JSON structure:</p>
    <pre>
    {
      "cmd": "add",
      "url": "https://example.com",
      "password": "your_password"
    }
    </pre>
    <p>Replace "add" with "del" or "qry" for other operations.</p>
</body>
</html>
`;

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

  // Handle root path
  if (!path) {
    console.log("Serving welcome page");
    return new Response(welcome_html, { headers: response_header });
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
          headers: { ...response_header, "Content-Type": "application/json" },
        });
      }

      switch (cmd) {
        case "add":
          // Add logic remains the same
          // ...
        case "del":
          // Delete logic remains the same
          // ...
        case "qry":
          // Query logic remains the same
          // ...
        default:
          console.log(`Invalid command: ${cmd}`);
          return new Response(JSON.stringify({ status: 400, error: "Invalid command" }), {
            headers: { ...response_header, "Content-Type": "application/json" },
          });
      }
    } catch (error) {
      console.error("Error processing POST request:", error);
      return new Response(JSON.stringify({ status: 500, error: "Server error" }), {
        headers: { ...response_header, "Content-Type": "application/json" },
      });
    }
  }

  // Handle GET requests (URL redirection or 404)
  if (request.method === "GET") {
    console.log(`Handling GET request for path: ${path}`);
    try {
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
