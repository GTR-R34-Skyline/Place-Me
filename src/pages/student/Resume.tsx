import { useCallback, useEffect, useState } from "react";

import { StudentLayout } from "@/components/layout/StudentLayout";
import { ResumeDropzone } from "@/components/resume/ResumeDropzone";
import { ResumeFileCard } from "@/components/resume/ResumeFileCard";
import { ResumeTipsCard } from "@/components/resume/ResumeTipsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function ResumePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [resumeFile, setResumeFile] = useState<{ name: string; url: string } | null>(null);

  const validateResumeFile = (file: File) => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

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
          const { data: urlData, error: urlError } = await supabase.storage
            .from("resumes")
            .createSignedUrl(`${user.id}/${file.name}`, 3600);

          if (urlError) throw urlError;

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

  const uploadResume = async (file: File) => {
    if (!user) return;
    if (!validateResumeFile(file)) return;

    setIsUploading(true);
    try {
      // Delete existing resume if any
      if (resumeFile) {
        await supabase.storage
          .from("resumes")
          .remove([`${user.id}/${resumeFile.name}`]);
      }

      // Upload new resume
      const fileName = `resume_${Date.now()}.pdf`;
      const { error } = await supabase.storage
        .from("resumes")
        .upload(`${user.id}/${fileName}`, file);

      if (error) throw error;

      toast({
        title: "Resume uploaded",
        description: "Your resume has been uploaded successfully.",
      });

      await fetchResume();
    } catch (error: unknown) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Failed to upload resume',
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !resumeFile) return;

    try {
      const { error } = await supabase.storage
        .from("resumes")
        .remove([`${user.id}/${resumeFile.name}`]);

      if (error) throw error;

      setResumeFile(null);
      toast({
        title: "Resume deleted",
        description: "Your resume has been removed.",
      });
    } catch (error: unknown) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : 'Failed to delete resume',
        variant: "destructive",
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
              <ResumeFileCard
                fileName={resumeFile.name}
                fileUrl={resumeFile.url}
                disabled={isUploading}
                onDelete={handleDelete}
                onReplace={uploadResume}
              />
            ) : (
              <div className="space-y-4">
                <ResumeDropzone disabled={isUploading} onFileSelected={uploadResume} />
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading…
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <ResumeTipsCard />
      </div>
    </StudentLayout>
  );
}
