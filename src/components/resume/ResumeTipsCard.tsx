import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export function ResumeTipsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Resume Tips</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
            <span>Keep your resume to 1-2 pages for optimal readability</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
            <span>Highlight relevant skills and projects</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
            <span>Use a clean, professional format</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
            <span>Include contact information and links to profiles</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
