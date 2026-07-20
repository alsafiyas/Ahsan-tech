export interface Customer {
  id: string;
  type: 'physical' | 'legal';
  name: string;
  company?: string;
  phone: string;
  telegram?: string;
  email?: string;
  address: string;
  district?: string;
  city: string;
  status: 'active' | 'inactive' | 'vip';
  totalContracts: number;
  totalDebt: number;
  lastActivity: string;
  avatar?: string;
}
