export interface Airline {
  id: string;
  name: string;
  iata_code: string;
  status: 'pending_onboarding' | 'active' | 'suspended';
  created_at: string;
}

export interface Agreement {
  id: string;
  airline_id: string;
  version: string;
  status: 'draft' | 'sent' | 'signed' | 'completed';
  signed_at?: string;
  notified_at?: string;
  file_path?: string;
  support_term_years: number;
  validity_days: number;
}

export interface Milestone {
  id: string;
  agreement_id: string;
  milestone_type: 'hardware_ownership' | 'network_readiness' | 'sat_sign_off' | 'muse_cupps_certified';
  status: 'pending' | 'in_progress' | 'completed' | 'deemed_accepted';
  details?: any;
  completed_at?: string;
}

export interface Penalty {
  id: string;
  airline_id: string;
  amount_kd: number;
  description: string;
  annex_reference: string;
  status: 'pending' | 'paid' | 'offset';
  created_at: string;
}
