import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Skill, Interest, UserSkill, UserInterest, ProfileCompletion, BranchType } from '@/lib/types';
import { useAuth } from './useAuth';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [userInterests, setUserInterests] = useState<UserInterest[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasResume, setHasResume] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData as Profile);

      // Fetch user skills with skill details
      const { data: skillsData, error: skillsError } = await supabase
        .from('user_skills')
        .select('*, skill:skills(*)')
        .eq('user_id', user.id);

      if (skillsError) throw skillsError;
      setUserSkills((skillsData as UserSkill[]) || []);

      // Fetch user interests with interest details
      const { data: interestsData, error: interestsError } = await supabase
        .from('user_interests')
        .select('*, interest:interests(*)')
        .eq('user_id', user.id);

      if (interestsError) throw interestsError;
      setUserInterests((interestsData as UserInterest[]) || []);

      // Check for resume
      const { data: files } = await supabase.storage
        .from('resumes')
        .list(user.id);
      
      setHasResume((files?.length ?? 0) > 0);

      // Fetch all available skills and interests
      const [{ data: allSkillsData }, { data: allInterestsData }] = await Promise.all([
        supabase.from('skills').select('*').order('category', { ascending: true }).order('name', { ascending: true }),
        supabase.from('interests').select('*').order('name', { ascending: true }),
      ]);

      setAllSkills((allSkillsData as Skill[]) || []);
      setAllInterests((allInterestsData as Interest[]) || []);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data as Profile);
    }

    return { data, error };
  };

  const addSkill = async (skillId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('user_skills')
      .insert({ user_id: user.id, skill_id: skillId })
      .select('*, skill:skills(*)')
      .single();

    if (!error && data) {
      setUserSkills(prev => [...prev, data as UserSkill]);
    }

    return { data, error };
  };

  const removeSkill = async (userSkillId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('user_skills')
      .delete()
      .eq('id', userSkillId);

    if (!error) {
      setUserSkills(prev => prev.filter(us => us.id !== userSkillId));
    }

    return { error };
  };

  const addInterest = async (interestId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('user_interests')
      .insert({ user_id: user.id, interest_id: interestId })
      .select('*, interest:interests(*)')
      .single();

    if (!error && data) {
      setUserInterests(prev => [...prev, data as UserInterest]);
    }

    return { data, error };
  };

  const removeInterest = async (userInterestId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('user_interests')
      .delete()
      .eq('id', userInterestId);

    if (!error) {
      setUserInterests(prev => prev.filter(ui => ui.id !== userInterestId));
    }

    return { error };
  };

  const getProfileCompletion = useCallback((): ProfileCompletion => {
    if (!profile) return { percentage: 0, missingFields: ['Profile not loaded'] };

    const fields = [
      { name: 'Full Name', value: profile.full_name },
      { name: 'Branch', value: profile.branch },
      { name: 'Year', value: profile.year },
      { name: 'CGPA', value: profile.cgpa },
      { name: 'Skills', value: userSkills.length > 0 },
      { name: 'Interests', value: userInterests.length > 0 },
      { name: 'Resume', value: hasResume },
    ];

    const completedFields = fields.filter(f => !!f.value);
    const missingFields = fields.filter(f => !f.value).map(f => f.name);
    const percentage = Math.round((completedFields.length / fields.length) * 100);

    return { percentage, missingFields };
  }, [profile, userSkills, userInterests, hasResume]);

  return {
    profile,
    userSkills,
    userInterests,
    allSkills,
    allInterests,
    isLoading,
    hasResume,
    updateProfile,
    addSkill,
    removeSkill,
    addInterest,
    removeInterest,
    getProfileCompletion,
    refetch: fetchProfile,
  };
}
