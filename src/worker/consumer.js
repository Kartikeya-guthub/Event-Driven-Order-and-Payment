require('dotenv').config();
const { Kafka } = require('kafkajs');
const { processPayment } = require('./paymentService');
const client = require('../db/connection');

const kafka = new Kafka({
  clientId: 'payment-worker',
  brokers: [process.env.KAFKA_BROKER],
});

const consumer = kafka.consumer({
  groupId: 'payment-group',
});

async function startConsumer() {
  await consumer.connect();
  console.log('[Worker] Connected to Kafka');

  await consumer.subscribe({
    topic: 'order-events',
    fromBeginning: true,
  });

  console.log('[Worker] Subscribed to order-events. Waiting for messages...');

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      await handleMessage(topic, partition, message);
    },
  });
}

async function handleMessage(topic, partition, message) {
  try {
    const rawValue = message.value.toString();
    const event = JSON.parse(rawValue);

    if (!event.event_id || !event.event_type) {
      throw new Error('Invalid event format: missing event_id or event_type');
    }

    console.log('[Worker] Received event:', {
      topic,
      partition,
      offset: message.offset,
      event,
    });

    console.log('[Worker] Connecting to DB...');
    const dbClient = await client.client();
    console.log('[Worker] DB connected.');

    try {
      await dbClient.query('BEGIN');

      // Step 1: idempotency check
      const res = await dbClient.query(
        `
        INSERT INTO processed_events(event_id)
        VALUES ($1)
        ON CONFLICT DO NOTHING
        RETURNING event_id
        `,
        [event.event_id]
      );

      // If no row inserted → duplicate
      if (res.rowCount === 0) {
        console.log('Duplicate event skipped:', event.event_id);
        await dbClient.query('COMMIT');
        return;
      }

      await dbClient.query('COMMIT');
      console.log('[Worker] Event marked as processed:', event.event_id);

    } catch (err) {
      await dbClient.query('ROLLBACK');
      console.error('Error inserting processed event:', err);
      return;
    } finally {
      dbClient.release();
    }

    // 🔌 Connect Worker to Payment
    if (event.event_type === 'OrderCreated') {
      console.log('[Worker] Processing payment for event:', event.event_id);
      await processPayment(event);
    }

  } catch (error) {
    console.error('[Worker] Error processing message:', {
      topic,
      partition,
      offset: message.offset,
      error: error.message,
      stack: error.stack,
    });
  }
}

async function shutdown() {
  console.log('[Worker] Shutting down...');
  await consumer.disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startConsumer().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});