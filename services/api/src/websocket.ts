import { WebSocketServer, WebSocket } from "ws";
import { Kafka } from "kafkajs";
import type { Server } from "http";

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");
const KAFKA_TOPIC = process.env.KAFKA_TOPIC ?? "ucl-live-feed";

const kafka = new Kafka({
  clientId: "ucl-api-ws",
  brokers: KAFKA_BROKERS,
});

const consumer = kafka.consumer({ groupId: "ucl-ws-live-feed" });

let wss: WebSocketServer;

function broadcast(data: string): void {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

export async function startWebSocketServer(server: Server): Promise<void> {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    console.log(`[WebSocket] Client connected (total: ${wss.clients.size})`);
    ws.on("close", () => {
      console.log(`[WebSocket] Client disconnected (total: ${wss.clients.size})`);
    });
  });

  // Subscribe to Kafka and broadcast to WebSocket clients
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const value = message.value?.toString();
          if (!value || wss.clients.size === 0) return;

          broadcast(value);
        } catch (err) {
          console.error("[WebSocket] Error processing Kafka message:", err);
        }
      },
    });

    console.log(`[WebSocket] Live feed active on /ws (Kafka → clients)`);
  } catch (err) {
    console.error("[WebSocket] Failed to connect to Kafka:", err);
    console.warn("[WebSocket] Live feed unavailable — GraphQL still operational");
  }
}

export async function stopWebSocketServer(): Promise<void> {
  await consumer.disconnect();
  wss?.close();
}
