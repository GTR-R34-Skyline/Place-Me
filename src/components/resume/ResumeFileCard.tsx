import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText, Trash2, Upload } from "lucide-react";

type ResumeFileCardProps = {
  fileName: string;
  fileUrl: string;
  disabled?: boolean;
  onDelete: () => void;
  onReplace: (file: File) => void;
};

export function ResumeFileCard({
  fileName,
  fileUrl,
  disabled,
  onDelete,
  onReplace,
}: ResumeFileCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
        <div className="rounded-lg bg-primary/10 p-3">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{fileName}</p>
          <div className="mt-1 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm text-success">Uploaded successfully</span>
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onReplace(file);
          e.currentTarget.value = "";
        }}
      />

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            <FileText className="mr-2 h-4 w-4" />
            View Resume
          </a>
        </Button>

        <Button variant="outline" onClick={onDelete} disabled={disabled}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>

        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          <Upload className="mr-2 h-4 w-4" />
          Replace
        </Button>
      </div>
    </div>
  );
}
