import {Consumer, Kafka} from 'kafkajs';
import {KafkaOptions, EventPayload} from './types/interfaces';

export class EventConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  eventListener: (event: EventPayload) => Promise<void>;

  constructor(options: KafkaOptions) {
    this.kafka = new Kafka(options.client);
    this.consumer = this.kafka.consumer(options.consumerConfig);
    this.eventListener = options.eventListener;
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

  bindTopicToConsumer(): void {
    this.consumer.run({
      eachMessage: async ({message}) => {
        await this.eventListener({
          offset: message.offset,
          key: message?.key?.toString(),
          value: JSON.parse(message.value?.toString() || ''),
        });
      },
    });
  }
}
