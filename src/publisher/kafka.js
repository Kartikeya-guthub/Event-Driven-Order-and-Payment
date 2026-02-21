const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'order-service',
    brokers: [process.env.KAFKA_BROKER],
});

const producer = kafka.producer({
    allowAutoTopicCreation: false,
    idempotent: true,
    maxInFlightRequests: 1,
    retry:{
        retries: 10,
    }
})

async function connectProducer(){
    await producer.connect();
    console.log('Kafka producer connected');
}

async function sendEvent(topic, key, value){
    await producer.send({
        topic,
        messages: [
            {
                key,
                value: value,
            }
        ]
    })
}

module.exports = {
    producer,
    connectProducer,
    sendEvent,
};