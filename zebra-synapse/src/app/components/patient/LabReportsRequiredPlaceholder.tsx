import { Link } from "react-router";
import { FileUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";

type Props = {
  title: string;
  description: string;
};

export default function LabReportsRequiredPlaceholder({ title, description }: Props) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-1">{description}</p>
      </div>
      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <FileUp className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <CardTitle>Lab reports required</CardTitle>
          <CardDescription>
            This section uses data from your uploaded lab files. Upload at least one report from{" "}
            <strong>Health Overview</strong> first. After upload, charts and recommendations can be
            tied to your results (structured extraction can be added next).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/patient">Go to Health Overview</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
