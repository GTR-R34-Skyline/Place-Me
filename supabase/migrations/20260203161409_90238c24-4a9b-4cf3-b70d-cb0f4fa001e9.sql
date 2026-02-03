-- Create enums for roles, job status, and skill categories
CREATE TYPE public.app_role AS ENUM ('student', 'admin');
CREATE TYPE public.job_status AS ENUM ('active', 'inactive');
CREATE TYPE public.skill_category AS ENUM ('technical', 'soft');
CREATE TYPE public.branch_type AS ENUM ('CSE', 'ECE', 'ME', 'EE', 'CE', 'IT', 'Other');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    branch branch_type,
    year INTEGER CHECK (year >= 1 AND year <= 4),
    cgpa NUMERIC(3,2) CHECK (cgpa >= 0 AND cgpa <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (CRITICAL: separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, role)
);

-- Create skills master table
CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category skill_category NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_skills junction table
CREATE TABLE public.user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, skill_id)
);

-- Create interests master table
CREATE TABLE public.interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_interests junction table
CREATE TABLE public.user_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    interest_id UUID REFERENCES public.interests(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, interest_id)
);

-- Create job_postings table
CREATE TABLE public.job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    company_name TEXT NOT NULL,
    description TEXT,
    min_cgpa NUMERIC(3,2) DEFAULT 0,
    preferred_branches branch_type[] DEFAULT '{}',
    interest_id UUID REFERENCES public.interests(id),
    status job_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create job_required_skills junction table
CREATE TABLE public.job_required_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.job_postings(id) ON DELETE CASCADE NOT NULL,
    skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(job_id, skill_id)
);

-- Create recommendation_logs for tracking views
CREATE TABLE public.recommendation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES public.job_postings(id) ON DELETE CASCADE NOT NULL,
    score NUMERIC(5,2),
    skill_match_score NUMERIC(5,2),
    cgpa_score NUMERIC(5,2),
    interest_score NUMERIC(5,2),
    explanation_data JSONB,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create placements table
CREATE TABLE public.placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES public.job_postings(id) ON DELETE CASCADE NOT NULL,
    placed_by UUID REFERENCES auth.users(id),
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, job_id)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_job_postings_updated_at
    BEFORE UPDATE ON public.job_postings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Helper function to check if current user is student
CREATE OR REPLACE FUNCTION public.is_student()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'student')
$$;

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_required_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (public.is_admin());

-- RLS Policies for skills (master list - readable by all authenticated)
CREATE POLICY "Authenticated users can view skills" ON public.skills
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage skills" ON public.skills
    FOR ALL USING (public.is_admin());

-- RLS Policies for user_skills
CREATE POLICY "Users can view own skills" ON public.user_skills
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user skills" ON public.user_skills
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can add own skills" ON public.user_skills
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own skills" ON public.user_skills
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for interests (master list - readable by all authenticated)
CREATE POLICY "Authenticated users can view interests" ON public.interests
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage interests" ON public.interests
    FOR ALL USING (public.is_admin());

-- RLS Policies for user_interests
CREATE POLICY "Users can view own interests" ON public.user_interests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user interests" ON public.user_interests
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can add own interests" ON public.user_interests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own interests" ON public.user_interests
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for job_postings
CREATE POLICY "Students can view active jobs" ON public.job_postings
    FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can view all jobs" ON public.job_postings
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert jobs" ON public.job_postings
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update jobs" ON public.job_postings
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete jobs" ON public.job_postings
    FOR DELETE USING (public.is_admin());

-- RLS Policies for job_required_skills
CREATE POLICY "Authenticated can view job skills" ON public.job_required_skills
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage job skills" ON public.job_required_skills
    FOR ALL USING (public.is_admin());

-- RLS Policies for recommendation_logs
CREATE POLICY "Users can view own recommendations" ON public.recommendation_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all recommendations" ON public.recommendation_logs
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can log own recommendations" ON public.recommendation_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for placements
CREATE POLICY "Users can view own placements" ON public.placements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all placements" ON public.placements
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can create placements" ON public.placements
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update placements" ON public.placements
    FOR UPDATE USING (public.is_admin());

-- Create resumes storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resumes', 'resumes', false, 10485760, ARRAY['application/pdf']);

-- Storage RLS for resumes bucket
CREATE POLICY "Users can upload own resume" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'resumes' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own resume" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'resumes' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own resume" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'resumes' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own resume" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'resumes' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Admins can view all resumes" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'resumes' AND 
        public.is_admin()
    );