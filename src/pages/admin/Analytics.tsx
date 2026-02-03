import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface SkillDemand {
  name: string;
  count: number;
}

interface BranchDistribution {
  name: string;
  value: number;
}

export default function AdminAnalytics() {
  const [isLoading, setIsLoading] = useState(true);
  const [skillDemand, setSkillDemand] = useState<SkillDemand[]>([]);
  const [branchDistribution, setBranchDistribution] = useState<BranchDistribution[]>([]);
  const [placementStats, setPlacementStats] = useState({
    placed: 0,
    active: 0,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        // Fetch skill demand from job postings
        const { data: jobSkills } = await supabase
          .from('job_required_skills')
          .select('skill:skills(name)');

        const skillCountMap = new Map<string, number>();
        (jobSkills as any[] || []).forEach((js) => {
          const skillName = js.skill?.name;
          if (skillName) {
            skillCountMap.set(skillName, (skillCountMap.get(skillName) || 0) + 1);
          }
        });

        const topSkills = Array.from(skillCountMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }));

        setSkillDemand(topSkills);

        // Fetch branch distribution from profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('branch');

        const branchCountMap = new Map<string, number>();
        (profiles || []).forEach((p: any) => {
          const branch = p.branch || 'Unknown';
          branchCountMap.set(branch, (branchCountMap.get(branch) || 0) + 1);
        });

        const branchData = Array.from(branchCountMap.entries())
          .map(([name, value]) => ({ name, value }));

        setBranchDistribution(branchData);

        // Fetch placement stats
        const [placementsResult, studentsResult] = await Promise.all([
          supabase.from('placements').select('id', { count: 'exact' }),
          supabase.from('user_roles').select('id', { count: 'exact' }).eq('role', 'student'),
        ]);

        const placed = placementsResult.count || 0;
        const totalStudents = studentsResult.count || 0;

        setPlacementStats({
          placed,
          active: totalStudents - placed,
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Insights and statistics for placement planning.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Demanded Skills */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Demanded Skills</CardTitle>
                <CardDescription>Skills most frequently required across job postings</CardDescription>
              </CardHeader>
              <CardContent>
                {skillDemand.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No skill data available. Add job postings with required skills.
                  </p>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={skillDemand} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={90} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Branch Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Students by Branch</CardTitle>
                <CardDescription>Distribution of registered students</CardDescription>
              </CardHeader>
              <CardContent>
                {branchDistribution.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No student data available.</p>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={branchDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {branchDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Placement Status */}
            <Card>
              <CardHeader>
                <CardTitle>Placement Status</CardTitle>
                <CardDescription>Placed vs active students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Placed', value: placementStats.placed },
                          { name: 'Active', value: placementStats.active },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#3b82f6" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
