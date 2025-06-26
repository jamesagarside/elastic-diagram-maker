const http = require("http");
const fs = require("fs");
const path = require("path");
const https = require("https");

const PORT = process.env.PORT || 3000;
const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".otf": "font/otf",
};

// We'll always serve from the build directory for both production and development
// This way we can avoid React dev server conflicts
const PUBLIC_DIR = path.join(__dirname, "build");

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.url}`);

  // Handle API proxy for Elastic deployment templates
  if (req.url === "/api/deployment-templates") {
    console.log("Proxying request to Elastic deployment templates API");

    // Set CORS headers for all responses
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle OPTIONS pre-flight requests
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Fetch data from the actual Elastic API
    const options = {
      hostname: "cloud.elastic.co",
      path: "/api/v1/platform/configuration/templates/deployments/global",
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "ElasticDiagramMaker/1.0",
      },
    };

    console.log("Fetching data from Elastic API...");

    const proxyReq = https.request(options, (proxyRes) => {
      let data = "";

      // Handle HTTP status errors
      if (proxyRes.statusCode !== 200) {
        console.error(
          `Elastic API responded with status ${proxyRes.statusCode}`
        );
        res.writeHead(proxyRes.statusCode, {
          "Content-Type": "application/json",
        });
        res.end(
          JSON.stringify({
            error: `Elastic API responded with status ${proxyRes.statusCode}`,
            message: proxyRes.statusMessage,
          })
        );
        return;
      }

      proxyRes.on("data", (chunk) => {
        data += chunk;
      });

      proxyRes.on("end", () => {
        try {
          // Try parsing the JSON to make sure it's valid
          const parsedData = JSON.parse(data);
          console.log(
            `Received ${parsedData.length} deployment templates from Elastic API`
          );
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(data);
        } catch (e) {
          console.error("Error parsing JSON from Elastic API:", e);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Failed to parse deployment templates",
              message: e.message,
            })
          );
        }
      });
    });

    // Set a timeout for the request
    proxyReq.setTimeout(30000, () => {
      console.error("Request to Elastic API timed out");
      proxyReq.abort();
      res.writeHead(504, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Request to Elastic API timed out" }));
    });

    proxyReq.on("error", (error) => {
      console.error(`Error proxying to Elastic API: ${error}`);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Failed to fetch deployment templates",
          message: error.message,
        })
      );
    });

    proxyReq.end();
    return;
  }
  // Handle API proxy for Elastic deployment templates by region
  else if (req.url.startsWith("/api/deployment-templates-by-region")) {
    console.log(
      "Proxying request to Elastic deployment templates by region API"
    );

    // Set CORS headers for all responses
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle OPTIONS pre-flight requests
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Extract the region parameter from the URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const regionId = url.searchParams.get("region");

    if (!regionId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Region parameter is required" }));
      return;
    }

    console.log(`Fetching deployment templates for region: ${regionId}`);

    // Fetch data from the Elastic API with the region parameter
    const options = {
      hostname: "cloud.elastic.co",
      path: `/api/v1/deployments/templates?region=${encodeURIComponent(
        regionId
      )}`,
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "ElasticDiagramMaker/1.0",
      },
    };

    console.log(`Calling: ${options.hostname}${options.path}`);

    const proxyReq = https.request(options, (proxyRes) => {
      let data = "";

      // Handle HTTP status errors
      if (proxyRes.statusCode !== 200) {
        console.error(
          `Elastic API responded with status ${proxyRes.statusCode}`
        );
        res.writeHead(proxyRes.statusCode, {
          "Content-Type": "application/json",
        });
        res.end(
          JSON.stringify({
            error: `Elastic API responded with status ${proxyRes.statusCode}`,
            message: proxyRes.statusMessage,
          })
        );
        return;
      }

      proxyRes.on("data", (chunk) => {
        data += chunk;
      });

      proxyRes.on("end", () => {
        try {
          // Try parsing the JSON to make sure it's valid
          const parsedData = JSON.parse(data);
          console.log(`Received deployment templates for region ${regionId}`);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(data);
        } catch (e) {
          console.error("Error parsing JSON from Elastic API:", e);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Failed to parse deployment templates",
              message: e.message,
            })
          );
        }
      });
    });

    // Set a timeout for the request
    proxyReq.setTimeout(30000, () => {
      console.error("Request to Elastic API timed out");
      proxyReq.abort();
      res.writeHead(504, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Request to Elastic API timed out" }));
    });

    proxyReq.on("error", (error) => {
      console.error(`Error proxying to Elastic API: ${error}`);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Failed to fetch deployment templates",
          message: error.message,
        })
      );
    });

    proxyReq.end();
    return;
  }

  // Handle favicon.ico
  if (req.url === "/favicon.ico") {
    const faviconPath = path.join(PUBLIC_DIR, "favicon.ico");
    if (fs.existsSync(faviconPath)) {
      fs.readFile(faviconPath, (err, content) => {
        if (err) {
          res.writeHead(204);
          res.end();
        } else {
          res.writeHead(200, { "Content-Type": "image/x-icon" });
          res.end(content);
        }
      });
      return;
    }
    res.writeHead(204);
    res.end();
    return;
  }

  // Normalize URL
  let filePath;

  // Clean up the URL
  let url = req.url;

  // Remove query parameters
  if (url.includes("?")) {
    url = url.split("?")[0];
  }

  // Handle the root path
  if (url === "/" || url === "") {
    filePath = path.join(PUBLIC_DIR, "index.html");
  }
  // Handle API endpoints
  else if (url.startsWith("/api/")) {
    if (url !== "/api/deployment-templates") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "API endpoint not found" }));
      return;
    }
    // The /api/deployment-templates endpoint is handled separately
  }
  // Handle all other requests as static file requests
  else {
    // Remove leading slash and clean URL
    const urlPath = url.startsWith("/") ? url.substring(1) : url;

    // Create file path
    filePath = path.join(PUBLIC_DIR, urlPath);
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        console.error(`File not found: ${filePath}`);

        // For all routes that don't match physical files, serve index.html for SPA
        // This allows React Router to handle those routes
        fs.readFile(
          path.join(PUBLIC_DIR, "index.html"),
          (indexErr, indexContent) => {
            if (indexErr) {
              console.error(`Error reading index.html: ${indexErr.code}`);
              res.writeHead(404);
              res.end("404 - File Not Found");
            } else {
              // In production mode, we need to serve the processed index.html
              console.log(`Serving index.html for route: ${req.url}`);
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(indexContent, "utf-8");
            }
          }
        );
      } else {
        console.error(`Server error: ${error.code}`);
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

// Graceful shutdown for handling SIGTERM
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    // OpenTelemetry SDK shutdown is handled in telemetry.js
    if (!telemetry.isEnabled) {
      process.exit(0);
    }
  });
});
