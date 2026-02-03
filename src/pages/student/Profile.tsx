import { useState } from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, X, Plus } from 'lucide-react';
import { BranchType } from '@/lib/types';

const branches: BranchType[] = ['CSE', 'ECE', 'ME', 'EE', 'CE', 'IT', 'Other'];
const years = [1, 2, 3, 4];

export default function ProfilePage() {
  const {
    profile,
    userSkills,
    userInterests,
    allSkills,
    allInterests,
    isLoading,
    updateProfile,
    addSkill,
    removeSkill,
    addInterest,
    removeInterest,
  } = useProfile();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    branch: profile?.branch || '',
    year: profile?.year?.toString() || '',
    cgpa: profile?.cgpa?.toString() || '',
  });

  // Update form when profile loads
  useState(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        branch: profile.branch || '',
        year: profile.year?.toString() || '',
        cgpa: profile.cgpa?.toString() || '',
      });
    }
  });

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await updateProfile({
        full_name: formData.full_name || null,
        branch: (formData.branch as BranchType) || null,
        year: formData.year ? parseInt(formData.year) : null,
        cgpa: formData.cgpa ? parseFloat(formData.cgpa) : null,
      });

      if (error) throw error;

      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully.',
      });
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSkill = async (skillId: string) => {
    const { error } = await addSkill(skillId);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add skill',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveSkill = async (userSkillId: string) => {
    const { error } = await removeSkill(userSkillId);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove skill',
        variant: 'destructive',
      });
    }
  };

  const handleAddInterest = async (interestId: string) => {
    const { error } = await addInterest(interestId);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add interest',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveInterest = async (userInterestId: string) => {
    const { error } = await removeInterest(userInterestId);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove interest',
        variant: 'destructive',
      });
    }
  };

  const availableSkills = allSkills.filter(
    (skill) => !userSkills.some((us) => us.skill_id === skill.id)
  );

  const availableInterests = allInterests.filter(
    (interest) => !userInterests.some((ui) => ui.interest_id === interest.id)
  );

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information and preferences.
          </p>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Your personal details used for recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Select
                  value={formData.branch}
                  onValueChange={(value) => setFormData({ ...formData, branch: value })}
                >
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Select
                  value={formData.year}
                  onValueChange={(value) => setFormData({ ...formData, year: value })}
                >
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        Year {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cgpa">CGPA</Label>
                <Input
                  id="cgpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={formData.cgpa}
                  onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                  placeholder="e.g. 8.5"
                />
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
            <CardDescription>
              Add your technical and soft skills for better job matches.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Skills */}
            <div className="space-y-2">
              <Label>Your Skills</Label>
              <div className="flex flex-wrap gap-2">
                {userSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No skills added yet</p>
                ) : (
                  userSkills.map((us) => (
                    <Badge
                      key={us.id}
                      variant={us.skill?.category === 'technical' ? 'default' : 'secondary'}
                      className="flex items-center gap-1"
                    >
                      {us.skill?.name}
                      <button
                        onClick={() => handleRemoveSkill(us.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Add Skills */}
            {availableSkills.length > 0 && (
              <div className="space-y-2">
                <Label>Add Skills</Label>
                <Select onValueChange={handleAddSkill}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a skill to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSkills.map((skill) => (
                      <SelectItem key={skill.id} value={skill.id}>
                        {skill.name} ({skill.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interests */}
        <Card>
          <CardHeader>
            <CardTitle>Interests</CardTitle>
            <CardDescription>
              Select your domain interests for personalized recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Interests */}
            <div className="space-y-2">
              <Label>Your Interests</Label>
              <div className="flex flex-wrap gap-2">
                {userInterests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No interests added yet</p>
                ) : (
                  userInterests.map((ui) => (
                    <Badge key={ui.id} variant="outline" className="flex items-center gap-1">
                      {ui.interest?.name}
                      <button
                        onClick={() => handleRemoveInterest(ui.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Add Interests */}
            {availableInterests.length > 0 && (
              <div className="space-y-2">
                <Label>Add Interests</Label>
                <Select onValueChange={handleAddInterest}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an interest to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInterests.map((interest) => (
                      <SelectItem key={interest.id} value={interest.id}>
                        {interest.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
