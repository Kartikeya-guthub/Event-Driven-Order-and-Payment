require('dotenv').config();
const { Kafka } = require('kafkajs');

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