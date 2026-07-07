export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: string; // savings / current / joint
  branch?: string;
  nominee?: string;
  notes?: string;
}

export interface Investment {
  id: string;
  type: string; // unit trust / ASB / gold / shares / EPF
  institution: string;
  accountNumber: string;
  approxValue?: string;
  lastUpdated?: string;
  agentContact?: string;
}

export interface InsurancePolicy {
  id: string;
  provider: string;
  policyNumber: string;
  policyType: string; // life / medical / motor / takaful
  beneficiary?: string;
  agentName?: string;
  agentContact?: string;
  premiumDueDate?: string;
}

export interface TrustedContact {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
  role?: string; // e.g. "Executor", "Lawyer", "Family"
}

export interface DocumentLocation {
  id: string;
  documentName: string; // e.g. "Original Will"
  location: string; // e.g. "Safe deposit box, Bank X, Branch Y"
  notes?: string;
}

export interface WasiatNote {
  id: string;
  title: string;
  content: string;
}

export type RecordKind =
  | 'accounts'
  | 'investments'
  | 'insurance'
  | 'documents'
  | 'wasiat';
