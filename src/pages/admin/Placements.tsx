import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Award, Plus, Calendar } from 'lucide-react';
import { Placement, Profile, JobPosting } from '@/lib/types';

interface PlacementWithDetails extends Placement {
  profile?: Profile;
  job?: JobPosting;
}

export default function AdminPlacements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [placements, setPlacements] = useState<PlacementWithDetails[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedJob, setSelectedJob] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch placements
      const { data: placementsData, error: placementsError } = await supabase
        .from('placements')
        .select('*')
        .order('placed_at', { ascending: false });

      if (placementsError) throw placementsError;

      // Fetch all profiles and jobs for lookups
      const [profilesResult, jobsResult] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('job_postings').select('*'),
      ]);

      const profiles = (profilesResult.data as Profile[]) || [];
      const allJobs = (jobsResult.data as JobPosting[]) || [];

      // Create lookup maps
      const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
      const jobMap = new Map(allJobs.map((j) => [j.id, j]));

      // Combine placement data with profiles and jobs
      const placementsWithDetails: PlacementWithDetails[] = (placementsData || []).map((p) => ({
        ...p,
        profile: profileMap.get(p.user_id),
        job: jobMap.get(p.job_id),
      }));

      setPlacements(placementsWithDetails);

      // Get placed student IDs to exclude from available students
      const placedStudentIds = new Set(placementsData?.map((p) => p.user_id) || []);

      // Filter to students not yet placed
      const availableStudents = profiles.filter((p) => !placedStudentIds.has(p.user_id));
      setStudents(availableStudents);
      setJobs(allJobs.filter((j) => j.status === 'active'));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePlacement = async () => {
    if (!selectedStudent || !selectedJob) {
      toast({
        title: 'Validation Error',
        description: 'Please select both a student and a job',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('placements').insert({
        user_id: selectedStudent,
        job_id: selectedJob,
        placed_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Student marked as placed successfully',
      });

      setIsDialogOpen(false);
      setSelectedStudent('');
      setSelectedJob('');
      fetchData();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create placement',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Placements</h1>
            <p className="text-muted-foreground">Track and manage student placements.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Mark Placement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mark Student as Placed</DialogTitle>
                <DialogDescription>
                  Select a student and the job they were placed in.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Student</label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.user_id} value={student.user_id}>
                          {student.full_name || 'Unnamed'} - {student.branch || 'No branch'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Job</label>
                  <Select value={selectedJob} onValueChange={setSelectedJob}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a job" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.title} - {job.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePlacement} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Placement
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : placements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Award className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No placements recorded</h3>
              <p className="text-muted-foreground">
                Mark students as placed when they secure positions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Placed On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {placements.map((placement) => (
                  <TableRow key={placement.id}>
                    <TableCell className="font-medium">
                      {placement.profile?.full_name || 'Unknown'}
                    </TableCell>
                    <TableCell>{placement.profile?.branch || '-'}</TableCell>
                    <TableCell>{placement.job?.title || 'Unknown'}</TableCell>
                    <TableCell>{placement.job?.company_name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(placement.placed_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Placements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{placements.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Companies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(placements.map((p) => p.job?.company_name)).size}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Available Students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.length}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
