// src/types.ts
export interface ArduinoEvent {
  action: 'connected' | 'disconnected';
  port: string;
  vid: number;
  pid: number;
  product?: string;
}


export interface PatientDataRecord {
    id: number;
    admission_no: string;
    national_id: string | null;
    firstname: string;
    lastname: string;
    classification: string;
    doctor: string | null;
    contact_person: string | null,
    telephone_1: string | null,
    telephone_2: string | null
}