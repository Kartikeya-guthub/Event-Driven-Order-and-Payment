require('dotenv').config();
const db = require('../db/connection');
const { producer, connectProducer } = require('./kafka');

const BATCH_SIZE = 10;
const POLL_INTERVAL = 2000;
const TOPIC = 'order-events';

async function pollOutbox() {
  const client = await db.client();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
      SELECT *
      FROM outbox
      WHERE published = false
      ORDER BY created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
      `,
      [BATCH_SIZE]
    );

    if (result.rows.length === 0) {
      await client.query('COMMIT');
      return;
    }

    // Build messages following Phase 6 event contract
    const messages = result.rows.map(row => ({
      key: row.aggregate_id, // CRITICAL for ordering
      value: JSON.stringify({
        event_id: row.event_id,
        aggregate_type: row.aggregate_type,
        aggregate_id: row.aggregate_id,
        event_type: row.event_type,
        payload: row.payload,
        created_at: row.created_at,
      }),
    }));

    // Send batch to Kafka
    await producer.send({
      topic: TOPIC,
      acks: -1,
      messages,
    });

    // Mark events as published
    for (const row of result.rows) {
      await client.query(
        `
        UPDATE outbox
        SET published = true,
            published_at = NOW()
        WHERE event_id = $1
        `,
        [row.event_id]
      );
    }

    await client.query('COMMIT');

    console.log(`Published batch of ${result.rows.length} events`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Outbox polling error:', err);
  } finally {
    client.release();
  }
}

async function startPolling() {
  await connectProducer();
  console.log('Starting outbox poller...');

  while (true) {
    try {
      await pollOutbox();
    } catch (err) {
      console.error('Polling loop error:', err);
    }

    await new Promise(resolve =>
      setTimeout(resolve, POLL_INTERVAL)
    );
  }
}

startPolling();