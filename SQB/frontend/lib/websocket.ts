import type { AIAnalysis, SimulatorMessage } from './types';

const WS_BASE = 'ws://localhost:8000';

export function createCallWebSocket(
  callId: number,
  onAnalysis: (data: AIAnalysis) => void,
  onToken: (token: string) => void,
): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws/call/${callId}`);

  ws.onopen = () => {
    console.log(`[WS] Call ${callId} connected`);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string) as { type?: string; token?: string } & AIAnalysis;
      if (data.type === 'suggestion_token' && data.token !== undefined) {
        onToken(data.token);
      } else if (data.type === 'analysis') {
        onAnalysis(data as AIAnalysis);
      }
    } catch (err) {
      console.error('[WS] Failed to parse message', err);
    }
  };

  ws.onerror = (err) => {
    console.error('[WS] Call WebSocket error', err);
  };

  ws.onclose = () => {
    console.log(`[WS] Call ${callId} disconnected`);
  };

  return ws;
}

export function createSimulatorWebSocket(
  sessionId: number,
  onMessage: (data: SimulatorMessage) => void
): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws/simulator/${sessionId}`);

  ws.onopen = () => {
    console.log(`[WS] Simulator session ${sessionId} connected`);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string) as SimulatorMessage;
      onMessage(data);
    } catch (err) {
      console.error('[WS] Failed to parse simulator message', err);
    }
  };

  ws.onerror = (err) => {
    console.error('[WS] Simulator WebSocket error', err);
  };

  ws.onclose = () => {
    console.log(`[WS] Simulator session ${sessionId} disconnected`);
  };

  return ws;
}
