const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const ordersRouter = require('./routes/orders');

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware



app.use('/orders', ordersRouter);

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


