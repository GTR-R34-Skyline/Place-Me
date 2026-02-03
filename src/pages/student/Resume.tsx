import { useState, useCallback } from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

export default function ResumePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [resumeFile, setResumeFile] = useState<{ name: string; url: string } | null>(null);

  const fetchResume = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: files, error } = await supabase.storage
        .from('resumes')
        .list(user.id);

      if (error) throw error;

      if (files && files.length > 0) {
        const file = files[0];
        const { data: urlData } = await supabase.storage
          .from('resumes')
          .createSignedUrl(`${user.id}/${file.name}`, 3600);

        setResumeFile({
          name: file.name,
          url: urlData?.signedUrl || '',
        });
      } else {
        setResumeFile(null);
      }
    } catch (error) {
      console.error('Error fetching resume:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchResume();
  }, [fetchResume]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      // Delete existing resume if any
      if (resumeFile) {
        await supabase.storage
          .from('resumes')
          .remove([`${user.id}/${resumeFile.name}`]);
      }

      // Upload new resume
      const fileName = `resume_${Date.now()}.pdf`;
      const { error } = await supabase.storage
        .from('resumes')
        .upload(`${user.id}/${fileName}`, file);

      if (error) throw error;

      toast({
        title: 'Resume uploaded',
        description: 'Your resume has been uploaded successfully.',
      });

      await fetchResume();
    } catch (error: unknown) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload resume',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !resumeFile) return;

    try {
      const { error } = await supabase.storage
        .from('resumes')
        .remove([`${user.id}/${resumeFile.name}`]);

      if (error) throw error;

      setResumeFile(null);
      toast({
        title: 'Resume deleted',
        description: 'Your resume has been removed.',
      });
    } catch (error: unknown) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete resume',
        variant: 'destructive',
      });
    }
  };

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resume</h1>
          <p className="text-muted-foreground">
            Upload your resume for placement opportunities.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Resume</CardTitle>
            <CardDescription>
              Upload a PDF version of your resume (max 10MB).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : resumeFile ? (
              <div className="space-y-4">
                {/* Resume Preview */}
                <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/50">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{resumeFile.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-sm text-success">Uploaded successfully</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button asChild variant="outline">
                    <a href={resumeFile.url} target="_blank" rel="noopener noreferrer">
                      <FileText className="mr-2 h-4 w-4" />
                      View Resume
                    </a>
                  </Button>
                  <Button variant="outline" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <label>
                    <Button variant="default" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Replace
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Empty State */}
                <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium">No resume uploaded</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload your resume to complete your profile
                  </p>
                </div>

                {/* Upload Button */}
                <label className="block">
                  <Button className="w-full" disabled={isUploading}>
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {isUploading ? 'Uploading...' : 'Upload Resume'}
                  </Button>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resume Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                <span>Keep your resume to 1-2 pages for optimal readability</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                <span>Highlight relevant skills and projects</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                <span>Use a clean, professional format</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                <span>Include contact information and links to profiles</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
