// src/types.ts
export interface ArduinoEvent {
  action: 'connected' | 'disconnected';
  port: string;
  vid: number;
  pid: number;
  product?: string;
}