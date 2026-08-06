import { JobType } from './dashboard';

export type SkillMatchingLogic = 'AND' | 'OR';

export interface LocationFilter {
  address: string;
  radius: number; // in kilometers
}

export interface RangeFilter {
  min: number;
  max: number;
}

export interface QueryFilter {
  // Key Features
  skills: string[];
  skillLogic: SkillMatchingLogic;
  
  // Geography
  location: string;
  radius: number;
  
  // Employment Details
  jobTypes: JobType[];
  
  // Financials
  salary: RangeFilter;
  
  // Intelligence
  aiScoreMin: number;
  
  // Seniority
  yearsExp: RangeFilter;
  
  // Lifecycle
  status: string[];
}

export const DEFAULT_FILTERS: QueryFilter = {
  skills: [],
  skillLogic: 'OR',
  location: '',
  radius: 25,
  jobTypes: [],
  salary: { min: 40000, max: 200000 },
  aiScoreMin: 0,
  yearsExp: { min: 0, max: 15 },
  status: [],
};
