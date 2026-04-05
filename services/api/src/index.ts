import "dotenv/config";
import http from "node:http";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import express from "express";
import cors from "cors";
import { connectMySQL, disconnectMySQL } from "./db/mysql.js";
import { connectMongoDB, disconnectMongoDB } from "./db/mongodb.js";
import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers.js";
import { startWebSocketServer, stopWebSocketServer } from "./websocket.js";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

if (!process.env.MONGODB_URI) {
  console.error("[API] MONGODB_URI environment variable is required");
  process.exit(1);
}
const MONGODB_URI = process.env.MONGODB_URI;

async function start(): Promise<void> {
  console.log("=".repeat(60));
  console.log("  UCL Data Pipeline — API Server");
  console.log(`  Port: ${PORT}`);
  console.log("=".repeat(60));

  // Connect databases
  await connectMySQL();
  await connectMongoDB(MONGODB_URI);

  // Apollo GraphQL server
  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();

  // Express + HTTP server
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/graphql", expressMiddleware(apollo));

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const server = http.createServer(app);

  // WebSocket live feed
  await startWebSocketServer(server);

  server.listen(PORT, () => {
    console.log(`[GraphQL]   http://localhost:${PORT}/graphql`);
    console.log(`[WebSocket] ws://localhost:${PORT}/ws`);
  });

  // Graceful shutdown
  let isShuttingDown = false;
  async function shutdown(): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log("\n[API] Shutting down...");
    await apollo.stop();
    await stopWebSocketServer();
    server.close();
    await disconnectMySQL();
    await disconnectMongoDB();
    process.exit(0);
  }

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

start().catch((err) => {
  console.error("[API] Fatal error:", err);
  process.exit(1);
});
