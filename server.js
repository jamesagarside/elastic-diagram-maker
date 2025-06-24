const http = require("http");
const fs = require("fs");
const path = require("path");

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
};

// Root directory for static files
// Use "build" directory in production, "public" in development
const PUBLIC_DIR =
  process.env.NODE_ENV === "production"
    ? path.join(__dirname, "build")
    : path.join(__dirname, "public");

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.url}`);

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
  // Fix for %PUBLIC_URL% paths
  const url = req.url.replace(/%PUBLIC_URL%\//g, "");

  if (url === "/") {
    filePath = path.join(PUBLIC_DIR, "index.html");
  } else {
    // Remove leading slash and use the path as is
    const urlPath = url.startsWith("/") ? url.substring(1) : url;
    filePath = path.join(PUBLIC_DIR, urlPath);
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        console.error(`File not found: ${filePath}`);

        // If a specific file is not found, try serving index.html (for SPA routing)
        if (!url.includes(".")) {
          fs.readFile(
            path.join(PUBLIC_DIR, "index.html"),
            (indexErr, indexContent) => {
              if (indexErr) {
                res.writeHead(404);
                res.end("404 - File Not Found");
              } else {
                // In production mode, we need to serve the processed index.html
                let indexContent_str = indexContent.toString();
                // No need to replace %PUBLIC_URL% as it's already handled in the build
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(indexContent, "utf-8");
              }
            }
          );
        } else {
          res.writeHead(404);
          res.end("404 - File Not Found");
        }
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
