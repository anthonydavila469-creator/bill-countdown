import { registerPlugin } from '@capacitor/core';

export interface WidgetPayloadV1 {
  version: number;
  generatedAt: number;
  currencyCode: string;
  totals: {
    totalDue: number;
    deltaVsLastMonth: number | null;
  };
  nextBill: {
    id: string;
    vendor: string;
    amount: number;
    dueDate: string;
    daysLeft: number;
    isAutopay: boolean;
    iconKey: string | null;
  } | null;
  upcoming: {
    id: string;
    vendor: string;
    amount: number;
    dueDate: string;
    daysLeft: number;
    urgency: 'critical' | 'soon' | 'later';
  }[];
}

export interface DuezoWidgetBridgePlugin {
  syncBills(options: { bills: any[] }): Promise<void>;
  syncPayload(options: { payload: string; theme: string }): Promise<void>;
  setTheme(options: { theme: string }): Promise<void>;
  clearBills(): Promise<void>;
}

const DuezoWidgetBridge = registerPlugin<DuezoWidgetBridgePlugin>('DuezoWidgetBridge');
export default DuezoWidgetBridge;
