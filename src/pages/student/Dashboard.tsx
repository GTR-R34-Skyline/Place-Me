import { Link } from 'react-router-dom';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Target, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function StudentDashboard() {
  const { profile, userSkills, isLoading, getProfileCompletion } = useProfile();
  const { percentage: profileCompletion, missingFields } = getProfileCompletion();

  // Calculate mock readiness score (will be replaced with real data from edge function)
  const readinessScore = Math.min(100, Math.round(userSkills.length * 12 + (profile?.cgpa ?? 0) * 5));

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your placement readiness.
          </p>
        </div>

        {/* Profile Completion Alert */}
        {profileCompletion < 100 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="rounded-full bg-warning/20 p-2">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Complete your profile</p>
                <p className="text-sm text-muted-foreground">
                  Add {missingFields.slice(0, 2).join(', ')}{missingFields.length > 2 ? ` and ${missingFields.length - 2} more` : ''} to get better recommendations.
                </p>
              </div>
              <Link to="/profile">
                <Button variant="outline" size="sm">
                  Complete Profile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Skill Readiness Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Skill Readiness Score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - readinessScore / 100)}`}
                      className={`transition-all duration-500 ${
                        readinessScore >= 70
                          ? 'text-success'
                          : readinessScore >= 40
                          ? 'text-warning'
                          : 'text-danger'
                      }`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                    {readinessScore}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold">{readinessScore}/100</p>
                  <p className="text-sm text-muted-foreground">
                    {readinessScore >= 70 ? 'Strong' : readinessScore >= 40 ? 'Moderate' : 'Needs Work'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills Count */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Your Skills</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userSkills.length}</p>
                  <p className="text-sm text-muted-foreground">Skills Added</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Completion */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Profile Completion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{profileCompletion}%</span>
                  <span className="text-sm text-muted-foreground">
                    {profileCompletion === 100 ? 'Complete!' : 'In Progress'}
                  </span>
                </div>
                <Progress value={profileCompletion} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Job Recommendations</CardTitle>
                  <CardDescription>
                    Discover roles that match your skills and interests
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link to="/recommendations">
                <Button className="w-full">
                  View My Recommendations
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Skill Readiness</CardTitle>
                  <CardDescription>
                    See your strengths and areas to improve
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link to="/skill-readiness">
                <Button variant="outline" className="w-full">
                  Check Skill Gaps
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Tips Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <span className="text-sm">
                  Complete your profile to get more accurate job recommendations
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <span className="text-sm">
                  Add your skills to see how you match with available positions
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <span className="text-sm">
                  Upload your resume for recruiters to review your qualifications
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
