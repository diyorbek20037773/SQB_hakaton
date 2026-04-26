export interface Customer {
  id: number;
  full_name: string;
  phone: string;
  segment: 'VIP' | 'Premium' | 'Standard';
  monthly_income: number;
  existing_products: string[];
  kyc_status: 'verified' | 'pending' | 'failed';
  aml_risk_level: 'low' | 'medium' | 'high';
  credit_score: number;
  age: number;
  language_pref: 'uz' | 'ru';
}

export interface Operator {
  id: number;
  full_name: string;
  employee_id: string;
  department: string;
  avg_satisfaction: number;
  total_calls: number;
  conversion_rate: number;
  is_online: boolean;
}

export interface Call {
  id: number;
  operator_id: number;
  customer_id: number;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'completed' | 'missed';
  transcript?: string;
  summary?: string;
  sentiment_score?: number;
  compliance_score?: number;
  nbo_offered?: ProductRecommendation;
  nbo_accepted?: boolean;
  objections_detected?: Objection[];
  satisfaction_rating?: number;
  topics?: string[];
  customer?: Customer;
  operator?: Operator;
}

export interface AIAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  sentiment_score: number;
  compliance_alerts: ComplianceAlert[];
  detected_objection?: { type: string; customer_said: string };
  suggested_response: string;
  nbo?: ProductRecommendation;
  topics: string[];
  kyc_checklist_update: KYCChecklist;
}

export interface ProductRecommendation {
  product_id: string;
  product_name: string;
  reason: string;
  confidence: number;
}

export interface ComplianceAlert {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Objection {
  type: string;
  customer_said: string;
}

export interface KYCChecklist {
  income_verified: boolean;
  purpose_stated: boolean;
  pep_checked: boolean;
}

export interface TranscriptLine {
  speaker: 'operator' | 'customer';
  text: string;
  timestamp: string;
}

export interface SimulatorSession {
  id: number;
  operator_id: number;
  persona_type: 'angry' | 'confused' | 'savvy';
  started_at: string;
  ended_at?: string;
  score?: number;
  feedback?: string;
  transcript?: string;
}

export interface SimulatorMessage {
  ai_response: string;
  scores: {
    empathy: number;
    compliance: number;
    product_knowledge: number;
    objection_handling: number;
  };
  feedback: string;
}

export interface KPI {
  total_calls_today: number;
  avg_satisfaction: number;
  compliance_rate: number;
  conversion_rate: number;
}
