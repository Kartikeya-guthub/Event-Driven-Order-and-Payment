const express = require('express');
const app = express();

app.use(express.json());

app.post('/pay', async (req, res) => {
  const { order_id, amount } = req.body;

  console.log(`Received payment request for order: ${order_id}`);
  await new Promise(r => setTimeout(r, 10000)); // 10s delay

  const rand = Math.random();
  if (rand < 0.7) {
    return res.json({ status: 'success' });
  } else if (rand < 0.9) {
    return res.status(500).json({ status: 'failed' });
  } else {
    return res.json({ status: 'success' });
  }
});

app.listen(4000, () => {
  console.log('Mock Payment running on 4000');
});