import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, Upload } from "lucide-react";

type ResumeDropzoneProps = {
  disabled?: boolean;
  onFileSelected: (file: File) => void;
};

export function ResumeDropzone({ disabled, onFileSelected }: ResumeDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    onFileSelected(file);
  };

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed p-6 transition-colors",
        isDragActive ? "bg-accent/30" : "bg-muted/20",
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        setIsDragActive(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        setIsDragActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (disabled) return;
        const file = e.dataTransfer.files?.[0];
        handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          // allow selecting the same file again
          e.currentTarget.value = "";
        }}
      />

      <div className="flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-muted p-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 font-medium">Drag & drop your resume PDF</h3>
        <p className="mt-1 text-sm text-muted-foreground">or choose a file to upload</p>

        <div className="mt-4">
          <Button type="button" onClick={openPicker} disabled={disabled}>
            <Upload className="mr-2 h-4 w-4" />
            Choose file
          </Button>
        </div>
      </div>
    </div>
  );
}
