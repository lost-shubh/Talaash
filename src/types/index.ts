export type UserRole = 'admin' | 'user';
export type ReportStatus = 'pending' | 'missing' | 'found' | 'rejected';
export type ReportType = 'child' | 'adult' | 'elderly' | 'family';
export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  created_at: string;
  is_active: boolean;
}

export interface Report {
  id: string;
  case_number: string;
  name: string;
  age: number;
  gender: Gender;
  last_seen: string;
  location: string;
  state: string;
  description: string;
  physical_desc: string;
  identifying_marks?: string;
  age_progression?: string;
  report_type: ReportType;
  status: ReportStatus;
  reporter_id: string;
  contact_name: string;
  contact_phone: string;
  contact_relation: string;
  admin_notes?: string;
  verified_by?: string;
  created_at: string;
  updated_at: string;
  photos?: Photo[];
  sightings?: Sighting[];
  reporter?: Pick<User, 'id' | 'name' | 'email'>;
}

export interface Photo {
  id: string;
  report_id: string;
  filename: string;
  data: string;
  uploaded_at: string;
}

export interface Sighting {
  id: string;
  report_id: string;
  reporter_name?: string;
  description: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  report_id: string;
  action: string;
  user_id?: string;
  notes?: string;
  timestamp: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh',
  'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
] as const;
