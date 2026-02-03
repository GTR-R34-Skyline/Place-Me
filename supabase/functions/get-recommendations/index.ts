import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = claimsData.claims.sub;

    // Fetch user data
    const [profileResult, userSkillsResult, userInterestsResult, jobsResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('user_skills').select('skill_id').eq('user_id', userId),
      supabase.from('user_interests').select('interest_id').eq('user_id', userId),
      supabase.from('job_postings').select('*, interest:interests(*), required_skills:job_required_skills(*, skill:skills(*))').eq('status', 'active'),
    ]);

    const profile = profileResult.data;
    const userSkillIds = new Set((userSkillsResult.data || []).map((s: any) => s.skill_id));
    const userInterestIds = new Set((userInterestsResult.data || []).map((i: any) => i.interest_id));
    const jobs = jobsResult.data || [];

    // Calculate recommendations
    const recommendations = jobs.map((job: any) => {
      const requiredSkills = job.required_skills || [];
      const requiredSkillIds = requiredSkills.map((rs: any) => rs.skill_id);

      // Skill match (50%)
      const matchedSkillIds = requiredSkillIds.filter((id: string) => userSkillIds.has(id));
      const skillMatchPercent = requiredSkillIds.length > 0
        ? (matchedSkillIds.length / requiredSkillIds.length) * 100
        : (userSkillIds.size > 0 ? 50 : 25);

      // CGPA (25%)
      const userCgpa = profile?.cgpa || 0;
      const minCgpa = job.min_cgpa || 0;
      let cgpaScore = minCgpa === 0 ? 100 : userCgpa >= minCgpa 
        ? Math.min(100, ((userCgpa - minCgpa) / (10 - minCgpa)) * 50 + 50)
        : Math.max(0, (userCgpa / minCgpa) * 50);

      // Interest (25%)
      const interestMatch = job.interest_id && userInterestIds.has(job.interest_id);
      const interestScore = interestMatch ? 100 : (userInterestIds.size > 0 ? 25 : 50);

      const totalScore = Math.round(skillMatchPercent * 0.5 + cgpaScore * 0.25 + interestScore * 0.25);

      return {
        job_id: job.id,
        totalScore,
        skillMatchScore: Math.round(skillMatchPercent),
        cgpaScore: Math.round(cgpaScore),
        interestScore: Math.round(interestScore),
        matchedSkills: requiredSkills.filter((rs: any) => userSkillIds.has(rs.skill_id)).map((rs: any) => rs.skill),
        missingSkills: requiredSkills.filter((rs: any) => !userSkillIds.has(rs.skill_id)).map((rs: any) => rs.skill),
      };
    });

    recommendations.sort((a: any, b: any) => b.totalScore - a.totalScore);

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
