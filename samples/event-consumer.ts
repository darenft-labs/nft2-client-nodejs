import * as dotenv from 'dotenv';
dotenv.config({
  path: __dirname + '/.env',
});

import {ConsumerConfig, KafkaConfig, InstrumentationEvent} from 'kafkajs';
import {EventConsumer, EventType} from '../src';
import {EventPayload} from '../src/event-consumer/types/interfaces';

const handleConsumerError = async (err: InstrumentationEvent<any>) => {
  console.log(err);
};

type NFT2_LOCKED = {
  from: string;
  token: string;
  tokenid: string;
};

type NFT2_TRANSFERED = {
  from: string;
  to: string;
  tokenid: string;
};

async function main() {
  const client = {
    clientId: process.env.KAFKA_CLIENT_ID,
    brokers: [process.env.KAFKA_BROKERS],
    ssl: true,
    sasl: {
      mechanism: 'plain',
      username: process.env.KAFKA_USERNAME,
      password: process.env.KAFKA_PASSWD,
    },
    requestTimeout: 30000,
    retry: {
      initialRetryTime: 2000,
      multiplier: 2,
      maxRetryTime: 30000,
      retries: 5,
    },
  } as KafkaConfig;

  const consumerConfig = {
    groupId: `${process.env.KAFKA_GROUP_PREFIX}.${process.env.KAFKA_GROUP_NAME}`,
  } as ConsumerConfig;

  const eventConsumer = new EventConsumer({
    client,
    consumerConfig,
    // filter is Optional for now, will be strict in the future
    filter: {
      contracts: ['0x8eb1efeCFBE3FC221116963D1E996c426D0cd402'],
      events: [EventType.NFT2_UPDATE_METADATA],
    },
    eventListener: async (
      event: EventPayload<NFT2_LOCKED & NFT2_TRANSFERED>
    ) => {
      console.log(event);
    },
  });

  await eventConsumer.connect();
  await eventConsumer.subscribe(process.env.KAFKA_TOPIC || '');
  const consumer = eventConsumer.getConsumer();

  const {DISCONNECT, CRASH, STOP} = consumer.events;
  consumer.on(DISCONNECT, e => {
    handleConsumerError(e);
  });
  consumer.on(CRASH, e => {
    handleConsumerError(e);
  });
  consumer.on(STOP, e => {
    handleConsumerError(e);
  });

  eventConsumer.bindTopicToConsumer();
}

main().catch(console.error);
