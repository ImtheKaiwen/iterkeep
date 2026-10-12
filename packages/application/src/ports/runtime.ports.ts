export interface ClockPort {
  now(): string;
  receiptExpiresAt(): string;
}

export interface IdFactoryPort {
  next(): string;
}

export interface PayloadHasherPort {
  hash(commandName: string, payload: unknown): string;
}
