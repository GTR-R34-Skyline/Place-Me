import { useState, useEffect } from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ChevronDown, CheckCircle2, AlertCircle, Sparkles, Building2 } from 'lucide-react';
import { JobPosting, Skill, JobRequiredSkill, Interest } from '@/lib/types';

interface RecommendationResult {
  job: JobPosting & { interest?: Interest; required_skills?: (JobRequiredSkill & { skill: Skill })[] };
  totalScore: number;
  skillMatchScore: number;
  cgpaScore: number;
  interestScore: number;
  matchedSkills: Skill[];
  missingSkills: Skill[];
  explanation: string;
}

export default function RecommendationsPage() {
  const { user } = useAuth();
  const { profile, userSkills, userInterests } = useProfile();
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        // Fetch active jobs with their required skills and interests
        const { data: jobs, error } = await supabase
          .from('job_postings')
          .select(`
            *,
            interest:interests(*),
            required_skills:job_required_skills(*, skill:skills(*))
          `)
          .eq('status', 'active');

        if (error) throw error;

        // Calculate recommendations client-side for now (will be moved to edge function)
        const userSkillIds = new Set(userSkills.map((us) => us.skill_id));
        const userInterestIds = new Set(userInterests.map((ui) => ui.interest_id));

        const results: RecommendationResult[] = ((jobs as any[]) || []).map((job) => {
          const requiredSkillsList = job.required_skills || [];
          const requiredSkillIds = requiredSkillsList.map((rs: any) => rs.skill_id);

          // Calculate skill match score (50% weight)
          const matchedSkillIds = requiredSkillIds.filter((id: string) => userSkillIds.has(id));
          const skillMatchPercent = requiredSkillIds.length > 0
            ? (matchedSkillIds.length / requiredSkillIds.length) * 100
            : (userSkills.length > 0 ? 50 : 25); // Cold start handling

          const matchedSkills = requiredSkillsList
            .filter((rs: any) => userSkillIds.has(rs.skill_id))
            .map((rs: any) => rs.skill);

          const missingSkills = requiredSkillsList
            .filter((rs: any) => !userSkillIds.has(rs.skill_id))
            .map((rs: any) => rs.skill);

          // Calculate CGPA score (25% weight)
          const userCgpa = profile?.cgpa || 0;
          const minCgpa = job.min_cgpa || 0;
          let cgpaScore = 0;
          if (minCgpa === 0) {
            cgpaScore = 100;
          } else if (userCgpa >= minCgpa) {
            cgpaScore = Math.min(100, ((userCgpa - minCgpa) / (10 - minCgpa)) * 50 + 50);
          } else {
            cgpaScore = Math.max(0, (userCgpa / minCgpa) * 50);
          }

          // Calculate interest score (25% weight)
          const interestMatch = job.interest_id && userInterestIds.has(job.interest_id);
          const interestScore = interestMatch ? 100 : (userInterests.length > 0 ? 25 : 50);

          // Calculate total score
          const totalScore = Math.round(
            skillMatchPercent * 0.5 +
            cgpaScore * 0.25 +
            interestScore * 0.25
          );

          // Generate explanation
          let explanation = '';
          if (matchedSkills.length > 0) {
            explanation += `You have ${matchedSkills.length} of ${requiredSkillIds.length} required skills. `;
          }
          if (userCgpa >= minCgpa) {
            explanation += `Your CGPA (${userCgpa}) meets the minimum requirement (${minCgpa}). `;
          } else if (minCgpa > 0) {
            explanation += `Your CGPA (${userCgpa}) is below the preferred ${minCgpa}, but you may still be considered. `;
          }
          if (interestMatch) {
            explanation += `This role aligns with your interest in ${job.interest?.name}. `;
          }

          return {
            job,
            totalScore,
            skillMatchScore: Math.round(skillMatchPercent),
            cgpaScore: Math.round(cgpaScore),
            interestScore: Math.round(interestScore),
            matchedSkills,
            missingSkills,
            explanation: explanation || 'Based on your profile and interests.',
          };
        });

        // Sort by total score descending
        results.sort((a, b) => b.totalScore - a.totalScore);
        setRecommendations(results);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [user, profile, userSkills, userInterests]);

  const toggleExpanded = (jobId: string) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-success';
    if (score >= 40) return 'text-warning';
    return 'text-danger';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return 'bg-success';
    if (score >= 40) return 'bg-warning';
    return 'bg-danger';
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recommendations</h1>
          <p className="text-muted-foreground">
            Job opportunities matched to your skills and interests.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : recommendations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-lg">No jobs available</h3>
              <p className="text-muted-foreground mt-1 max-w-md">
                There are no active job postings at the moment. Check back later for new opportunities.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <Card key={rec.job.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{rec.job.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {rec.job.company_name}
                          {rec.job.interest && (
                            <span className="ml-2">• {rec.job.interest.name}</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>

                    {/* Match Score */}
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(rec.totalScore)}`}>
                        {rec.totalScore}%
                      </div>
                      <p className="text-xs text-muted-foreground">Match</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Score Progress Bar */}
                  <div className="space-y-1">
                    <Progress 
                      value={rec.totalScore} 
                      className="h-2"
                    />
                  </div>

                  {/* Skills */}
                  <div className="space-y-2">
                    {rec.matchedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {rec.matchedSkills.map((skill) => (
                          <Badge key={skill.id} className="bg-success/10 text-success hover:bg-success/20">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {rec.missingSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {rec.missingSkills.slice(0, 5).map((skill) => (
                          <Badge key={skill.id} variant="outline" className="text-muted-foreground">
                            {skill.name}
                          </Badge>
                        ))}
                        {rec.missingSkills.length > 5 && (
                          <Badge variant="outline" className="text-muted-foreground">
                            +{rec.missingSkills.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expandable Details */}
                  <Collapsible open={expandedJobs.has(rec.job.id)}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(rec.job.id)}
                        className="w-full justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Why this recommendation?
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            expandedJobs.has(rec.job.id) ? 'rotate-180' : ''
                          }`}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3 space-y-4">
                      {/* Explanation */}
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {rec.explanation}
                      </p>

                      {/* Score Breakdown */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground mb-1">Skill Match</p>
                          <p className={`text-lg font-semibold ${getScoreColor(rec.skillMatchScore)}`}>
                            {rec.skillMatchScore}%
                          </p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground mb-1">CGPA</p>
                          <p className={`text-lg font-semibold ${getScoreColor(rec.cgpaScore)}`}>
                            {rec.cgpaScore}%
                          </p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground mb-1">Interest</p>
                          <p className={`text-lg font-semibold ${getScoreColor(rec.interestScore)}`}>
                            {rec.interestScore}%
                          </p>
                        </div>
                      </div>

                      {/* Job Details */}
                      {rec.job.description && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">About this role</p>
                          <p className="text-sm text-muted-foreground">{rec.job.description}</p>
                        </div>
                      )}

                      {/* Requirements */}
                      <div className="flex flex-wrap gap-2 text-sm">
                        {rec.job.min_cgpa > 0 && (
                          <Badge variant="outline">Min CGPA: {rec.job.min_cgpa}</Badge>
                        )}
                        {rec.job.preferred_branches?.map((branch: string) => (
                          <Badge key={branch} variant="outline">{branch}</Badge>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
