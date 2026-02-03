// Database types
export type AppRole = 'student' | 'admin';
export type JobStatus = 'active' | 'inactive';
export type SkillCategory = 'technical' | 'soft';
export type BranchType = 'CSE' | 'ECE' | 'ME' | 'EE' | 'CE' | 'IT' | 'Other';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  branch: BranchType | null;
  year: number | null;
  cgpa: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  created_at: string;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  created_at: string;
  skill?: Skill;
}

export interface Interest {
  id: string;
  name: string;
  created_at: string;
}

export interface UserInterest {
  id: string;
  user_id: string;
  interest_id: string;
  created_at: string;
  interest?: Interest;
}

export interface JobPosting {
  id: string;
  title: string;
  company_name: string;
  description: string | null;
  min_cgpa: number;
  preferred_branches: BranchType[];
  interest_id: string | null;
  status: JobStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  interest?: Interest;
  required_skills?: JobRequiredSkill[];
}

export interface JobRequiredSkill {
  id: string;
  job_id: string;
  skill_id: string;
  created_at: string;
  skill?: Skill;
}

export interface RecommendationLog {
  id: string;
  user_id: string;
  job_id: string;
  score: number;
  skill_match_score: number;
  cgpa_score: number;
  interest_score: number;
  explanation_data: Record<string, unknown>;
  logged_at: string;
}

export interface Placement {
  id: string;
  user_id: string;
  job_id: string;
  placed_by: string | null;
  placed_at: string;
  profile?: Profile;
  job?: JobPosting;
}

// Recommendation engine response
export interface JobRecommendation {
  job: JobPosting;
  totalScore: number;
  skillMatchScore: number;
  cgpaScore: number;
  interestScore: number;
  matchedSkills: Skill[];
  missingSkills: Skill[];
  explanation: string;
}

// Profile completion tracking
export interface ProfileCompletion {
  percentage: number;
  missingFields: string[];
}
