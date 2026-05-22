// // server.js

// const { createServer } = require("http");
// const { parse } = require("url");
// const next = require("next");
// const { initializeWebSocket } = require("./lib/websocket");

// const dev = process.env.NODE_ENV !== "production";
// const app = next({ dev });
// const handle = app.getRequestHandler();

// app.prepare().then(() => {
//   const server = createServer(async (req, res) => {
//     try {
//       const parsedUrl = parse(req.url, true);
//       handle(req, res, parsedUrl);
//     } catch (err) {
//       console.error("Error handling request:", err);
//       res.statusCode = 500;
//       res.end("Internal server error");
//     }
//   });

//   // Initialize WebSocket
//   initializeWebSocket(server);

//   const PORT = process.env.PORT || 5000;
//   server.listen(PORT, (err) => {
//     if (err) throw err;
//     console.log(`> Ready on http://localhost:${PORT}`);
//     console.log("> WebSocket server initialized");
//   });
// });

// server.js

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { initializeWebSocket } = require("./lib/websocket");

// Load the environment variables from your .env file
require("dotenv").config();

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  // Initialize WebSocket
  initializeWebSocket(server);

  // STRICTLY FROM ENV: No backup numbers here anymore.
  const PORT = process.env.PORT;

  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on port: ${PORT}`);
    console.log("> WebSocket server initialized");
  });
});
