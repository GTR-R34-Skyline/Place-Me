import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Users } from 'lucide-react';
import { Profile, BranchType } from '@/lib/types';

interface StudentWithDetails extends Profile {
  skills_count: number;
  interests_count: number;
}

export default function AdminStudents() {
  const [students, setStudents] = useState<StudentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoading(true);
      try {
        // Get all students (users with student role)
        const { data: studentRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'student');

        if (rolesError) throw rolesError;

        const studentIds = studentRoles?.map((r) => r.user_id) || [];

        if (studentIds.length === 0) {
          setStudents([]);
          setIsLoading(false);
          return;
        }

        // Fetch profiles for these students
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', studentIds);

        if (profilesError) throw profilesError;

        // Fetch skill counts
        const { data: skillCounts } = await supabase
          .from('user_skills')
          .select('user_id')
          .in('user_id', studentIds);

        // Fetch interest counts
        const { data: interestCounts } = await supabase
          .from('user_interests')
          .select('user_id')
          .in('user_id', studentIds);

        // Create count maps
        const skillCountMap = new Map<string, number>();
        const interestCountMap = new Map<string, number>();

        skillCounts?.forEach((s) => {
          skillCountMap.set(s.user_id, (skillCountMap.get(s.user_id) || 0) + 1);
        });

        interestCounts?.forEach((i) => {
          interestCountMap.set(i.user_id, (interestCountMap.get(i.user_id) || 0) + 1);
        });

        // Combine data
        const studentsWithDetails: StudentWithDetails[] = (profiles as Profile[] || []).map((profile) => ({
          ...profile,
          skills_count: skillCountMap.get(profile.user_id) || 0,
          interests_count: interestCountMap.get(profile.user_id) || 0,
        }));

        setStudents(studentsWithDetails);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, []);

  // Filter students
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      !searchQuery ||
      student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.branch?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBranch = branchFilter === 'all' || student.branch === branchFilter;

    return matchesSearch && matchesBranch;
  });

  const getProfileCompletion = (student: StudentWithDetails) => {
    let completed = 0;
    if (student.full_name) completed++;
    if (student.branch) completed++;
    if (student.year) completed++;
    if (student.cgpa) completed++;
    if (student.skills_count > 0) completed++;
    if (student.interests_count > 0) completed++;
    return Math.round((completed / 6) * 100);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">View and manage registered students.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              <SelectItem value="CSE">CSE</SelectItem>
              <SelectItem value="ECE">ECE</SelectItem>
              <SelectItem value="ME">ME</SelectItem>
              <SelectItem value="EE">EE</SelectItem>
              <SelectItem value="CE">CE</SelectItem>
              <SelectItem value="IT">IT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No students found</h3>
              <p className="text-muted-foreground">
                {students.length === 0
                  ? 'No students have registered yet.'
                  : 'Try adjusting your search or filters.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>CGPA</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => {
                  const completion = getProfileCompletion(student);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.full_name || 'Not provided'}
                      </TableCell>
                      <TableCell>{student.branch || '-'}</TableCell>
                      <TableCell>{student.year ? `Year ${student.year}` : '-'}</TableCell>
                      <TableCell>{student.cgpa || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.skills_count} skills</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={completion >= 80 ? 'default' : completion >= 50 ? 'secondary' : 'outline'}
                        >
                          {completion}% complete
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
