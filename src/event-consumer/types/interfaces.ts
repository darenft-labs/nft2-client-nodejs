import {ConsumerConfig, KafkaConfig} from 'kafkajs';

export interface KafkaOptions {
  client: KafkaConfig;
  consumerConfig: ConsumerConfig;
  eventListener: (event: EventPayload) => Promise<void>;
}

export interface EventPayload {
  offset: string;
  key?: string;
  value?: any;
}
