"use client";

import { useEffect, useRef, useState } from "react";

interface LiveEvent {
  id: string;
  type: string;
  minute: number;
  second: number;
  player?: string;
  team: string;
  location?: { x: number; y: number };
}

function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window === "undefined") return "ws://localhost:4000/ws";
  // Use the same hostname the browser is on, but point to the API port
  return `ws://${window.location.hostname}:4000/ws`;
}

const EVENT_COLORS: Record<string, string> = {
  Shot: "text-red-500",
  Goal: "text-green-500",
  Pass: "text-zinc-500 dark:text-zinc-400",
  "Foul Committed": "text-yellow-500",
  Substitution: "text-blue-500",
  Carry: "text-zinc-400 dark:text-zinc-500",
};

export default function LiveFeed() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new WebSocket(getWsUrl());

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as LiveEvent;
        setEvents((prev) => [event, ...prev].slice(0, 100));
      } catch {
        // skip malformed messages
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Live Feed</h2>
        <span
          className={`flex items-center gap-1.5 text-xs ${connected ? "text-green-500" : "text-zinc-400"}`}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-zinc-400"}`}
          />
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div
        ref={feedRef}
        className="h-80 overflow-y-auto rounded-lg bg-white p-3 font-mono text-sm dark:bg-zinc-900"
      >
        {events.length === 0 ? (
          <div className="flex h-full items-center justify-center text-zinc-400">
            {connected
              ? "Waiting for events... Run the producer to stream a match."
              : "Connecting to WebSocket..."}
          </div>
        ) : (
          events.map((event, i) => (
            <div
              key={`${event.id}-${i}`}
              className="border-b border-zinc-100 py-1.5 last:border-0 dark:border-zinc-800"
            >
              <span className="text-zinc-400">
                {event.minute}&apos;{String(event.second).padStart(2, "0")}
              </span>{" "}
              <span className={EVENT_COLORS[event.type] ?? "text-zinc-500"}>
                {event.type}
              </span>{" "}
              {event.player && (
                <span className="text-zinc-700 dark:text-zinc-300">
                  {event.player}
                </span>
              )}{" "}
              <span className="text-zinc-400">({event.team})</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
