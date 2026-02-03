import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { JobPosting, Skill, Interest, BranchType, JobStatus } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';

const branches: BranchType[] = ['CSE', 'ECE', 'ME', 'EE', 'CE', 'IT', 'Other'];

interface JobFormData {
  title: string;
  company_name: string;
  description: string;
  min_cgpa: string;
  preferred_branches: BranchType[];
  interest_id: string;
  status: JobStatus;
  required_skill_ids: string[];
}

const initialFormData: JobFormData = {
  title: '',
  company_name: '',
  description: '',
  min_cgpa: '0',
  preferred_branches: [],
  interest_id: '',
  status: 'active',
  required_skill_ids: [],
};

export default function AdminJobs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<(JobPosting & { interest?: Interest })[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [jobsResult, skillsResult, interestsResult] = await Promise.all([
        supabase
          .from('job_postings')
          .select('*, interest:interests(*)')
          .order('created_at', { ascending: false }),
        supabase.from('skills').select('*').order('name'),
        supabase.from('interests').select('*').order('name'),
      ]);

      if (jobsResult.error) throw jobsResult.error;
      if (skillsResult.error) throw skillsResult.error;
      if (interestsResult.error) throw interestsResult.error;

      setJobs((jobsResult.data as any[]) || []);
      setSkills((skillsResult.data as Skill[]) || []);
      setInterests((interestsResult.data as Interest[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateDialog = () => {
    setEditingJob(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = async (job: JobPosting) => {
    // Fetch required skills for this job
    const { data: jobSkills } = await supabase
      .from('job_required_skills')
      .select('skill_id')
      .eq('job_id', job.id);

    setEditingJob(job);
    setFormData({
      title: job.title,
      company_name: job.company_name,
      description: job.description || '',
      min_cgpa: job.min_cgpa?.toString() || '0',
      preferred_branches: job.preferred_branches || [],
      interest_id: job.interest_id || '',
      status: job.status,
      required_skill_ids: jobSkills?.map((js) => js.skill_id) || [],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.company_name) {
      toast({
        title: 'Validation Error',
        description: 'Title and company name are required',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const jobData = {
        title: formData.title,
        company_name: formData.company_name,
        description: formData.description || null,
        min_cgpa: parseFloat(formData.min_cgpa) || 0,
        preferred_branches: formData.preferred_branches,
        interest_id: formData.interest_id || null,
        status: formData.status,
        created_by: user?.id,
      };

      let jobId: string;

      if (editingJob) {
        // Update existing job
        const { data, error } = await supabase
          .from('job_postings')
          .update(jobData)
          .eq('id', editingJob.id)
          .select()
          .single();

        if (error) throw error;
        jobId = data.id;

        // Delete existing skills
        await supabase.from('job_required_skills').delete().eq('job_id', jobId);
      } else {
        // Create new job
        const { data, error } = await supabase
          .from('job_postings')
          .insert(jobData)
          .select()
          .single();

        if (error) throw error;
        jobId = data.id;
      }

      // Insert required skills
      if (formData.required_skill_ids.length > 0) {
        const skillInserts = formData.required_skill_ids.map((skill_id) => ({
          job_id: jobId,
          skill_id,
        }));

        const { error: skillError } = await supabase
          .from('job_required_skills')
          .insert(skillInserts);

        if (skillError) throw skillError;
      }

      toast({
        title: 'Success',
        description: editingJob ? 'Job updated successfully' : 'Job created successfully',
      });

      setIsDialogOpen(false);
      fetchData();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save job',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job posting?')) return;

    try {
      const { error } = await supabase.from('job_postings').delete().eq('id', jobId);
      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Job deleted successfully',
      });

      fetchData();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete job',
        variant: 'destructive',
      });
    }
  };

  const toggleBranch = (branch: BranchType) => {
    setFormData((prev) => ({
      ...prev,
      preferred_branches: prev.preferred_branches.includes(branch)
        ? prev.preferred_branches.filter((b) => b !== branch)
        : [...prev.preferred_branches, branch],
    }));
  };

  const toggleSkill = (skillId: string) => {
    setFormData((prev) => ({
      ...prev,
      required_skill_ids: prev.required_skill_ids.includes(skillId)
        ? prev.required_skill_ids.filter((id) => id !== skillId)
        : [...prev.required_skill_ids, skillId],
    }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Job Postings</h1>
            <p className="text-muted-foreground">Manage job and internship opportunities.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingJob ? 'Edit Job Posting' : 'Create Job Posting'}</DialogTitle>
                <DialogDescription>
                  {editingJob ? 'Update the job details below.' : 'Fill in the details for the new job posting.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Software Engineer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name *</Label>
                    <Input
                      id="company"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="e.g. Tech Corp"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Job description..."
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="cgpa">Minimum CGPA</Label>
                    <Input
                      id="cgpa"
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={formData.min_cgpa}
                      onChange={(e) => setFormData({ ...formData, min_cgpa: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interest">Domain/Interest</Label>
                    <Select
                      value={formData.interest_id}
                      onValueChange={(value) => setFormData({ ...formData, interest_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {interests.map((interest) => (
                          <SelectItem key={interest.id} value={interest.id}>
                            {interest.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: JobStatus) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Preferred Branches</Label>
                  <div className="flex flex-wrap gap-2">
                    {branches.map((branch) => (
                      <Badge
                        key={branch}
                        variant={formData.preferred_branches.includes(branch) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleBranch(branch)}
                      >
                        {branch}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Required Skills</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2">
                    {skills.map((skill) => (
                      <div key={skill.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={skill.id}
                          checked={formData.required_skill_ids.includes(skill.id)}
                          onCheckedChange={() => toggleSkill(skill.id)}
                        />
                        <label
                          htmlFor={skill.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {skill.name}
                          <span className="ml-2 text-xs text-muted-foreground">({skill.category})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingJob ? 'Update Job' : 'Create Job'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No job postings yet</h3>
              <p className="text-muted-foreground">Create your first job posting to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Min CGPA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>{job.company_name}</TableCell>
                    <TableCell>{job.interest?.name || '-'}</TableCell>
                    <TableCell>{job.min_cgpa || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(job)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(job.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
