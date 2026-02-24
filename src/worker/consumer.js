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

  console.log('[Worker] Subscribed to order-events');

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

    const db = await db.client();

    try {
      await db.query('BEGIN');

      // Step 1: idempotency check
      const res = await db.query(
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
        await db.query('COMMIT');
        return;
      }

      await db.query('COMMIT');

    } catch (err) {
      await db.query('ROLLBACK');
      console.error('Error inserting processed event:', err);
      return;
    } finally {
      db.release();
    }

    // 🔌 Connect Worker to Payment
    if (event.event_type === 'OrderCreated') {
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