"""
StatsBomb UCL Event Producer

Fetches historical Champions League match events from StatsBomb open data
and publishes them to Kafka to simulate a live event feed.
"""

import os
import sys
import time
import math
from datetime import datetime

import orjson
from dotenv import load_dotenv
from confluent_kafka import Producer, KafkaError
from statsbombpy import sb

load_dotenv()

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "ucl-live-feed")
EVENT_DELAY_MS = int(os.getenv("EVENT_DELAY_MS", "50"))

# UCL competition ID in StatsBomb
UCL_COMPETITION_ID = 16


def get_available_seasons() -> list[dict]:
    """Return available UCL seasons from StatsBomb."""
    comps = sb.competitions()
    ucl = comps[comps["competition_id"] == UCL_COMPETITION_ID]
    return ucl[["season_id", "season_name"]].to_dict("records")


def get_matches(season_id: int) -> list[dict]:
    """Return matches for a given UCL season."""
    matches = sb.matches(competition_id=UCL_COMPETITION_ID, season_id=season_id)
    return matches.to_dict("records")


def transform_location(raw_location) -> dict | None:
    """Normalize StatsBomb location arrays into {x, y} (and optional z)."""
    if not isinstance(raw_location, list) or len(raw_location) < 2:
        return None
    loc = {"x": raw_location[0], "y": raw_location[1]}
    if len(raw_location) == 3:
        loc["z"] = raw_location[2]
    return loc


def clean_value(val):
    """Strip NaN values so they don't pollute the JSON payload."""
    if isinstance(val, float) and math.isnan(val):
        return None
    if isinstance(val, list):
        return [clean_value(v) for v in val]
    return val


def transform_event(raw: dict, match_meta: dict) -> dict:
    """
    Transform a raw StatsBomb event into a clean Kafka message.
    Strips NaN fields, normalizes locations, attaches match metadata.
    """
    # Clean all values
    cleaned = {k: clean_value(v) for k, v in raw.items() if clean_value(v) is not None}

    # Normalize location fields
    for loc_field in ["location", "pass_end_location", "shot_end_location",
                      "carry_end_location", "goalkeeper_end_location"]:
        if loc_field in cleaned:
            cleaned[loc_field] = transform_location(cleaned[loc_field])

    # Attach match metadata envelope
    cleaned["match_meta"] = {
        "match_id": match_meta["match_id"],
        "home_team": match_meta["home_team"],
        "away_team": match_meta["away_team"],
        "home_score": match_meta["home_score"],
        "away_score": match_meta["away_score"],
        "match_date": match_meta["match_date"],
        "competition_stage": match_meta["competition_stage"],
        "stadium": match_meta.get("stadium", "").strip(),
    }

    # Add ingestion timestamp
    cleaned["produced_at"] = datetime.utcnow().isoformat() + "Z"

    return cleaned


def delivery_callback(err, msg):
    """Called once per message to indicate delivery result."""
    if err:
        print(f"  FAILED: {err}", file=sys.stderr)
    else:
        print(f"  -> partition {msg.partition()} | offset {msg.offset()}")


def stream_match(producer: Producer, match_meta: dict):
    """Fetch events for a match and publish each to Kafka."""
    match_id = match_meta["match_id"]
    print(f"\nStreaming match {match_id}: {match_meta['home_team']} vs {match_meta['away_team']}")
    print(f"  Date: {match_meta['match_date']} | Stage: {match_meta['competition_stage']}")

    events_df = sb.events(match_id=match_id)
    events = events_df.sort_values(["period", "minute", "second"]).to_dict("records")

    print(f"  Total events: {len(events)}")

    for i, raw_event in enumerate(events):
        event = transform_event(raw_event, match_meta)
        event_type = event.get("type", "Unknown")

        key = str(match_id)
        value = orjson.dumps(event)

        producer.produce(
            topic=KAFKA_TOPIC,
            key=key.encode("utf-8"),
            value=value,
            callback=delivery_callback,
        )

        # Flush every 100 messages to avoid buffer overflow
        if (i + 1) % 100 == 0:
            producer.flush()
            print(f"  Published {i + 1}/{len(events)} events...")

        time.sleep(EVENT_DELAY_MS / 1000)

    producer.flush()
    print(f"  Done. {len(events)} events published for match {match_id}.")


def select_match(matches: list[dict]) -> dict:
    """Let the user pick a match to stream."""
    print("\nAvailable matches:")
    for i, m in enumerate(matches):
        print(f"  [{i}] {m['home_team']} vs {m['away_team']} "
              f"({m['home_score']}-{m['away_score']}) "
              f"| {m['match_date']} | {m['competition_stage']}")

    while True:
        try:
            idx = int(input(f"\nSelect match [0-{len(matches)-1}]: "))
            if 0 <= idx < len(matches):
                return matches[idx]
        except (ValueError, EOFError):
            pass
        print("Invalid selection, try again.")


def select_season(seasons: list[dict]) -> int:
    """Let the user pick a UCL season."""
    print("\nAvailable UCL seasons:")
    for i, s in enumerate(seasons):
        print(f"  [{i}] {s['season_name']}")

    while True:
        try:
            idx = int(input(f"\nSelect season [0-{len(seasons)-1}]: "))
            if 0 <= idx < len(seasons):
                return seasons[idx]["season_id"]
        except (ValueError, EOFError):
            pass
        print("Invalid selection, try again.")


def main():
    print("=" * 60)
    print("  StatsBomb UCL Event Producer")
    print(f"  Kafka: {KAFKA_BOOTSTRAP_SERVERS} | Topic: {KAFKA_TOPIC}")
    print(f"  Delay between events: {EVENT_DELAY_MS}ms")
    print("=" * 60)

    # Initialize Kafka producer
    producer = Producer({
        "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
        "client.id": "ucl-statsbomb-producer",
    })

    # Select season and match
    seasons = get_available_seasons()
    season_id = select_season(seasons)
    matches = get_matches(season_id)
    match = select_match(matches)

    # Stream events
    stream_match(producer, match)
    print("\nProducer finished.")


if __name__ == "__main__":
    main()
