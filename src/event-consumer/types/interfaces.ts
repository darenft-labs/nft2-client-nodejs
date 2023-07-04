import {ConsumerConfig, KafkaConfig} from 'kafkajs';
import {EventType} from '../constants';

export interface KafkaOptions {
  client: KafkaConfig;
  consumerConfig: ConsumerConfig;
  eventListener: (event: EventPayload<any>) => Promise<void>;
  filter?: {
    events?: EventType[];
    contracts?: string[];
  };
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
  type: EventType;
}
