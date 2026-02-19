const express = require('express');
const router = express.Router();
const { createOrder } = require('../services/orderService');

router.post('/', async (req, res) => {
    try {
        const { userId, amount } = req.body;

        if (!userId || !amount) {
            return res.status(400).json({
                error: 'Missing required fields: userId and amount'
            });
        }

        const result = await createOrder({ userId, amount });

        res.status(201).json({
            order_id: result.orderId,
            event_id: result.eventId,
            message: 'Order created successfully'
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

module.exports = router;
