const express = require('express');
const router = express.Router();
const { createOrder } = require('../services/orderService');

router.post('/', async (req, res) => {
    try {
        const { user_id, amount } = req.body;

        if (!user_id) {
            return res.status(400).json({
                error: 'Missing required field: user_id'
            });
        }

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({
                error: 'Invalid field: amount must be a number greater than 0'
            });
        }

        const result = await createOrder({ userId: user_id, amount });

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
