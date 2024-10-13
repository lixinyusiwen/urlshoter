export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.slice(1);

  // Handle root path
  if (!path) {
    return new Response("Welcome to URL Shortener", {
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Handle API requests
  if (request.method === "POST") {
    try {
      const { cmd, url: longUrl, key, password } = await request.json();
      
      // Simple password check
      if (password !== await env.LINKS.get("password")) {
        return new Response(JSON.stringify({ error: "Invalid password" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      switch (cmd) {
        case "add":
          if (!longUrl) {
            return new Response(JSON.stringify({ error: "URL is required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }
          const shortKey = key || Math.random().toString(36).substr(2, 6);
          await env.LINKS.put(shortKey, longUrl);
          return new Response(JSON.stringify({ key: shortKey }), {
            headers: { "Content-Type": "application/json" },
          });
        
        case "get":
          if (!key) {
            return new Response(JSON.stringify({ error: "Key is required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }
          const value = await env.LINKS.get(key);
          if (!value) {
            return new Response(JSON.stringify({ error: "Key not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ url: value }), {
            headers: { "Content-Type": "application/json" },
          });

        default:
          return new Response(JSON.stringify({ error: "Invalid command" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: "Server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Handle GET requests (URL redirection)
  if (request.method === "GET") {
    const value = await env.LINKS.get(path);
    if (!value) {
      return new Response("Short URL not found", { status: 404 });
    }
    return Response.redirect(value, 302);
  }

  // Handle unsupported methods
  return new Response("Method not allowed", { status: 405 });
}
