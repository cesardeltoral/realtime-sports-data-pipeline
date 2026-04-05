import "dotenv/config";
import { Kafka } from "kafkajs";
import { connectMySQL, disconnectMySQL } from "./db/mysql.js";
import { connectMongoDB, disconnectMongoDB } from "./db/mongodb.js";
import { processEvent } from "./processor.js";
import type { StatsBombEvent } from "./types.js";

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");
const KAFKA_TOPIC = process.env.KAFKA_TOPIC ?? "ucl-live-feed";
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID ?? "ucl-consumer-group";
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://root:rootpassword@localhost:27017/ucl_events?authSource=admin";

const kafka = new Kafka({
  clientId: "ucl-consumer",
  brokers: KAFKA_BROKERS,
});

const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });

let eventCount = 0;
let errorCount = 0;

async function start(): Promise<void> {
  console.log("=".repeat(60));
  console.log("  UCL Event Consumer");
  console.log(`  Kafka: ${KAFKA_BROKERS.join(", ")} | Topic: ${KAFKA_TOPIC}`);
  console.log(`  Group: ${KAFKA_GROUP_ID}`);
  console.log("=".repeat(60));

  // Connect to databases
  await connectMySQL();
  await connectMongoDB(MONGODB_URI);

  // Connect to Kafka
  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: true });
  console.log(`[Kafka] Subscribed to ${KAFKA_TOPIC}`);

  // Process messages
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const value = message.value?.toString();
        if (!value) return;

        const event: StatsBombEvent = JSON.parse(value);

        if (!event.id || !event.type || !event.timestamp) {
          console.warn(`[Consumer] Skipping malformed event at offset ${message.offset}:`, { id: event.id, type: event.type });
          return;
        }

        await processEvent(event);

        eventCount++;
        if (eventCount % 100 === 0) {
          console.log(
            `[Consumer] Processed ${eventCount} events | ` +
            `partition=${partition} | offset=${message.offset} | ` +
            `type=${event.type} | errors=${errorCount}`
          );
        }
      } catch (err) {
        errorCount++;
        console.error(`[Consumer] Error processing message:`, err);
      }
    },
  });
}

// Graceful shutdown
let isShuttingDown = false;

async function shutdown(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("\n[Consumer] Shutting down...");
  await consumer.disconnect();
  await disconnectMySQL();
  await disconnectMongoDB();
  console.log(`[Consumer] Total processed: ${eventCount} | Errors: ${errorCount}`);
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

start().catch((err) => {
  console.error("[Consumer] Fatal error:", err);
  process.exit(1);
});
