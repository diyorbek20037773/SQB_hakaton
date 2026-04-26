import type {
  Customer,
  Operator,
  Call,
  KPI,
  SimulatorSession,
} from './types';

const BASE_URL = 'http://localhost:8000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// Customers
export function fetchCustomers(search?: string): Promise<Customer[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch<Customer[]>(`/api/customers${qs}`);
}

export function fetchCustomer(id: number): Promise<Customer> {
  return apiFetch<Customer>(`/api/customers/${id}`);
}

// Operators
export function fetchOperators(): Promise<Operator[]> {
  return apiFetch<Operator[]>('/api/operators');
}

export function fetchOperator(id: number): Promise<Operator> {
  return apiFetch<Operator>(`/api/operators/${id}`);
}

// Calls
export function fetchCalls(filters?: {
  operator_id?: number;
  status?: string;
}): Promise<Call[]> {
  const params = new URLSearchParams();
  if (filters?.operator_id) params.set('operator_id', String(filters.operator_id));
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<Call[]>(`/api/calls${qs}`);
}

export function fetchCall(id: number): Promise<Call> {
  return apiFetch<Call>(`/api/calls/${id}`);
}

export function startCall(
  operator_id: number,
  customer_id: number
): Promise<Call> {
  return apiFetch<Call>('/api/calls', {
    method: 'POST',
    body: JSON.stringify({ operator_id, customer_id }),
  });
}

export function endCall(id: number): Promise<Call> {
  return apiFetch<Call>(`/api/calls/${id}/end`, { method: 'POST' });
}

// Analytics
export function fetchAnalyticsSentimentTrend(): Promise<
  { date: string; avg_sentiment: number }[]
> {
  return apiFetch('/api/analytics/sentiment-trend');
}

export function fetchAnalyticsTopComplaints(): Promise<
  { topic: string; count: number }[]
> {
  return apiFetch('/api/analytics/top-complaints');
}

export function fetchAnalyticsProductDemand(): Promise<
  { product: string; recommended: number; accepted: number }[]
> {
  return apiFetch('/api/analytics/product-demand');
}

export function fetchAnalyticsOperatorEfficiency(): Promise<
  {
    operator: string;
    empathy: number;
    compliance: number;
    product_knowledge: number;
    objection_handling: number;
    speed: number;
  }[]
> {
  return apiFetch('/api/analytics/operator-efficiency');
}

// Supervisor
export function fetchSupervisorActiveCalls(): Promise<Call[]> {
  return apiFetch('/api/supervisor/active-calls');
}

export function fetchSupervisorKPIs(): Promise<KPI> {
  return apiFetch('/api/supervisor/kpis');
}

export function fetchSupervisorAlerts(): Promise<
  { type: string; description: string; severity: string; call_id?: number }[]
> {
  return apiFetch('/api/supervisor/alerts');
}

export function fetchSupervisorRankings(): Promise<
  { operator: Operator; score: number; rank: number }[]
> {
  return apiFetch('/api/supervisor/operator-rankings');
}

// Simulator
export function startSimulatorSession(
  operator_id: number,
  persona_type: string
): Promise<SimulatorSession> {
  return apiFetch<SimulatorSession>('/api/simulator/start', {
    method: 'POST',
    body: JSON.stringify({ operator_id, persona_type }),
  });
}

export function endSimulatorSession(session_id: number): Promise<SimulatorSession> {
  return apiFetch<SimulatorSession>(`/api/simulator/${session_id}/end`, {
    method: 'POST',
  });
}
