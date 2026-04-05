import mongoose from "mongoose";

export async function connectMongoDB(uri: string): Promise<void> {
  await mongoose.connect(uri);
  console.log("[MongoDB] Connected via Mongoose");
}

export async function disconnectMongoDB(): Promise<void> {
  await mongoose.disconnect();
  console.log("[MongoDB] Disconnected");
}
