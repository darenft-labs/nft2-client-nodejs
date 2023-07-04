import {Consumer, Kafka} from 'kafkajs';
import {KafkaOptions, EventPayload, EventMessage} from './types/interfaces';
import {EventType} from './constants';

export class EventConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  eventListener: (event: EventPayload<any>) => Promise<void>;
  filteredEvents: EventType[];
  filterContracts: string[];

  constructor(options: KafkaOptions) {
    this.kafka = new Kafka(options.client);
    this.consumer = this.kafka.consumer(options.consumerConfig);
    this.eventListener = options.eventListener;
    this.filteredEvents = options?.filter?.events || [];
    this.filterContracts =
      options?.filter?.contracts?.map(x => x.toLowerCase()) || [];
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
  }

  getConsumer(): Consumer {
    return this.consumer;
  }

  async subscribe(topic: string): Promise<void> {
    await this.consumer.subscribe({
      topic,
      fromBeginning: false,
    });
  }

  isFiltered(eventType: EventType, contractAddress: string): boolean {
    if (
      this.filteredEvents?.length &&
      !this.filteredEvents.includes(eventType)
    ) {
      return false;
    }

    if (
      this.filterContracts?.length &&
      !this.filterContracts.includes(contractAddress)
    ) {
      return false;
    }

    return true;
  }

  bindTopicToConsumer(): void {
    this.consumer.run({
      eachMessage: async ({message}) => {
        const value = JSON.parse(
          message.value?.toString() || ''
        ) as EventMessage<any>;
        if (this.isFiltered(value?.type, value?.smart_contract)) {
          await this.eventListener({
            offset: message.offset,
            key: message?.key?.toString(),
            value,
          });
        }
      },
    });
  }
}
