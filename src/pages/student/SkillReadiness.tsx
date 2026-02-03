import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { Skill, JobPosting, JobRequiredSkill } from '@/lib/types';

interface SkillDemand {
  skill: Skill;
  demandCount: number;
  isOwned: boolean;
}

export default function SkillReadinessPage() {
  const { userSkills, allSkills, isLoading: profileLoading } = useProfile();
  const [skillDemand, setSkillDemand] = useState<SkillDemand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSkillDemand = async () => {
      setIsLoading(true);
      try {
        // Fetch all job required skills
        const { data: jobSkills, error } = await supabase
          .from('job_required_skills')
          .select('skill_id, job:job_postings!inner(status)')
          .eq('job.status', 'active');

        if (error) throw error;

        // Count demand for each skill
        const demandMap = new Map<string, number>();
        (jobSkills as any[] || []).forEach((js) => {
          const count = demandMap.get(js.skill_id) || 0;
          demandMap.set(js.skill_id, count + 1);
        });

        // Create skill demand list
        const userSkillIds = new Set(userSkills.map((us) => us.skill_id));
        const demandList: SkillDemand[] = allSkills.map((skill) => ({
          skill,
          demandCount: demandMap.get(skill.id) || 0,
          isOwned: userSkillIds.has(skill.id),
        }));

        // Sort by demand (descending), then by whether owned
        demandList.sort((a, b) => {
          if (b.demandCount !== a.demandCount) {
            return b.demandCount - a.demandCount;
          }
          return (a.isOwned ? 1 : 0) - (b.isOwned ? 1 : 0);
        });

        setSkillDemand(demandList);
      } catch (error) {
        console.error('Error fetching skill demand:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!profileLoading) {
      fetchSkillDemand();
    }
  }, [userSkills, allSkills, profileLoading]);

  // Calculate readiness score
  const inDemandSkills = skillDemand.filter((sd) => sd.demandCount > 0);
  const ownedInDemandSkills = inDemandSkills.filter((sd) => sd.isOwned);
  const readinessScore = inDemandSkills.length > 0
    ? Math.round((ownedInDemandSkills.length / inDemandSkills.length) * 100)
    : userSkills.length > 0 ? 50 : 0;

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-success';
    if (score >= 40) return 'text-warning';
    return 'text-danger';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return 'stroke-success';
    if (score >= 40) return 'stroke-warning';
    return 'stroke-danger';
  };

  const strengths = skillDemand.filter((sd) => sd.isOwned && sd.demandCount > 0);
  const improvements = skillDemand.filter((sd) => !sd.isOwned && sd.demandCount > 0).slice(0, 5);

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Skill Readiness</h1>
          <p className="text-muted-foreground">
            See how your skills align with market demand.
          </p>
        </div>

        {isLoading || profileLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Readiness Score */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Readiness Score</CardTitle>
                <CardDescription>
                  Based on in-demand skills you possess
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative w-40 h-40">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - readinessScore / 100)}`}
                      className={`transition-all duration-1000 ${getScoreBgColor(readinessScore)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold ${getScoreColor(readinessScore)}`}>
                      {readinessScore}
                    </span>
                    <span className="text-sm text-muted-foreground">out of 100</span>
                  </div>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-4">
                  {readinessScore >= 70
                    ? 'Great! You have strong skills for the job market.'
                    : readinessScore >= 40
                    ? 'Good progress! Consider adding more in-demand skills.'
                    : 'Focus on building skills that employers are looking for.'}
                </p>
              </CardContent>
            </Card>

            {/* Strengths & Improvements */}
            <div className="lg:col-span-2 space-y-6">
              {/* Strengths */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <CardTitle className="text-lg">Your Strengths</CardTitle>
                  </div>
                  <CardDescription>
                    Skills you have that employers are looking for
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {strengths.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Add skills to your profile to see how they match job requirements.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {strengths.map((sd) => (
                        <Badge
                          key={sd.skill.id}
                          className="bg-success/10 text-success hover:bg-success/20"
                        >
                          {sd.skill.name}
                          <span className="ml-1.5 text-xs opacity-75">
                            ({sd.demandCount} {sd.demandCount === 1 ? 'job' : 'jobs'})
                          </span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Suggested Improvements */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-warning" />
                    <CardTitle className="text-lg">Suggested Skills to Learn</CardTitle>
                  </div>
                  <CardDescription>
                    High-demand skills that could boost your profile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {improvements.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No additional skill suggestions available at the moment.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {improvements.map((sd, index) => (
                        <div
                          key={sd.skill.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-warning/20 text-warning text-xs font-medium">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-medium">{sd.skill.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {sd.skill.category === 'technical' ? 'Technical Skill' : 'Soft Skill'}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {sd.demandCount} {sd.demandCount === 1 ? 'job' : 'jobs'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CTA */}
              <div className="flex gap-4">
                <Link to="/profile" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Add More Skills
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/recommendations" className="flex-1">
                  <Button className="w-full">
                    View Recommendations
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
