const db = require('../db/connection');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

async function processPayment(event){
    const {aggregate_id, payload} = event;

    const client = await db.client();
    const paymentAttempt_id = uuidv4();

    try{
        const result = await client.query(
            `
            UPDATE orders
            SET state = 'PAYMENT_PENDING',
                payment_attempt_id = $1,
                version = version + 1,
                updated_at = NOW()
            WHERE id = $2
            AND state = 'CREATED'
            RETURNING *
            `,
            [paymentAttempt_id, aggregate_id]
        );

        if(result.rowCount === 0){
          console.log(`Order ${aggregate_id} is not in a valid state for payment processing.`);
          return;
        }

        console.log(`Payment processing initiated for order ${aggregate_id} with payment attempt ID ${paymentAttempt_id}`);
    }
    finally{
        client.release();
    }

    try{
      const response = await axios.post('http://localhost:4000/pay',{
        order_id: aggregate_id,
        amount: payload.amount,
      },{
        timeout: 3000,
      });

      if(response.data.status === 'success'){
        await markPaid(aggregate_id);
      }else{
        await markFailed(aggregate_id);
      }

    }catch(err){
      console.error(`Payment processing error for order ${aggregate_id}:`, err.message);
      await markFailed(aggregate_id);
    }
}


// ================= MERGED markPaid =================
async function markPaid(orderId) {
  const client = await db.client();
  const eventId = uuidv4();

  try {
    await client.query('BEGIN');

    const res = await client.query(
      `
      UPDATE orders
      SET state = 'PAID',
          version = version + 1,
          updated_at = NOW()
      WHERE id = $1
        AND state = 'PAYMENT_PENDING'
      `,
      [orderId]
    );

    if (res.rowCount === 0) {
      await client.query('ROLLBACK');
      console.log('Skip PAID update, already processed');
      return;
    }

    const payload = {
      order_id: orderId,
    };

    await client.query(
      `
      INSERT INTO outbox (
        event_id,
        aggregate_type,
        aggregate_id,
        event_type,
        payload
      )
      VALUES ($1, 'ORDER', $2, 'OrderPaid', $3)
      `,
      [eventId, orderId, payload]
    );

    await client.query('COMMIT');

    console.log('Order PAID:', orderId);

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}


// ================= MERGED markFailed =================
async function markFailed(orderId) {
  const client = await db.client();
  const eventId = uuidv4();

  try {
    await client.query('BEGIN');

    const res = await client.query(
      `
      UPDATE orders
      SET state = 'FAILED',
          version = version + 1,
          updated_at = NOW()
      WHERE id = $1
        AND state = 'PAYMENT_PENDING'
      `,
      [orderId]
    );

    if (res.rowCount === 0) {
      await client.query('ROLLBACK');
      console.log('Skip FAILED update, already processed');
      return;
    }

    const payload = {
      order_id: orderId,
    };

    await client.query(
      `
      INSERT INTO outbox (
        event_id,
        aggregate_type,
        aggregate_id,
        event_type,
        payload
      )
      VALUES ($1, 'ORDER', $2, 'OrderFailed', $3)
      `,
      [eventId, orderId, payload]
    );

    await client.query('COMMIT');

    console.log('Order FAILED:', orderId);

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { processPayment, markPaid, markFailed };