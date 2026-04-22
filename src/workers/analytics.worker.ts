import { detectAnomalies } from '../utils/anomalyDetection';
import { predictChurn } from '../utils/churnPredictor';
import type { DailyLog } from '../types';

export type WorkerMessage = 
  | { type: 'ANALYZE_USER'; payload: { logs: DailyLog[]; streakDays: number; uid: string } };

export type WorkerResponse = 
  | { type: 'ANALYZE_RESULT'; payload: { uid: string; anomalies: any[]; churnRisk: number } };

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  if (e.data.type === 'ANALYZE_USER') {
    const { logs, streakDays, uid } = e.data.payload;
    
    // Ağır işlemleri worker içerisinde yürüt
    const anomalies = detectAnomalies(logs);
    const churnSignal = predictChurn(logs, streakDays);
    
    self.postMessage({
      type: 'ANALYZE_RESULT',
      payload: { uid, anomalies, churnRisk: churnSignal.riskScore }
    } as WorkerResponse);
  }
};
