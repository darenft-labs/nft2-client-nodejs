import {ConsumerConfig, KafkaConfig} from 'kafkajs';

export interface KafkaOptions {
  client: KafkaConfig;
  consumerConfig: ConsumerConfig;
  eventListener: (event: EventPayload<any>) => Promise<void>;
}

export interface EventPayload<T> {
  offset: string;
  key?: string;
  value?: EventMessage<T>;
}

export interface EventMessage<T> {
  smart_contract: string;
  blocknumber: number;
  blockhash: string;
  txhash: string;
  txindex: number;
  logindex: number;
  timestamp: number;
  chainid: number;
  signer: string;
  log_signature: string;
  log_data: string;
  log_topics: string[];
  metadata: T;
  type: string;
}
