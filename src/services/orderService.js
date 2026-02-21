const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

async function createOrder({ userId, amount }) {
    const client = await db.client();
    const orderId = uuidv4();
    const eventId = uuidv4();
    try {
        await client.query('BEGIN');

        await client.query(
            `
            INSERT INTO orders(id, user_id, amount, state, version)
            VALUES ($1, $2, $3, 'CREATED', 0)
            `,
            [orderId, userId, amount]
        );

        const payload = JSON.stringify({
            order_id: orderId,
            user_id: userId,
            amount,
        });// after order insert


        await client.query(
            `
            INSERT INTO outbox(event_id, aggregate_type, aggregate_id, event_type, payload, published, created_at)
            VALUES ($1, 'ORDER', $2, 'OrderCreated', $3, false, NOW())
            `,
            [eventId, orderId, payload]
        );

        await client.query('COMMIT');

        console.log(`Order created — orderId: ${orderId}, eventId: ${eventId}`);
        return { orderId, eventId };

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    createOrder,
};

