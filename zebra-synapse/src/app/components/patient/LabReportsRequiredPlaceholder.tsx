import { Link } from "react-router";
import { FileUp } from "lucide-react";
import { Button } from "../ui/button";
import {
  EmptyStateCard,
  PatientPageHero,
  PatientPortalPage,
  portalPrimaryButtonClass,
} from "./PortalTheme";

type Props = {
  title: string;
  description: string;
};

export default function LabReportsRequiredPlaceholder({ title, description }: Props) {
  return (
    <PatientPortalPage>
      <PatientPageHero
        eyebrow="Patient Portal"
        title={title}
        description={description}
        icon={FileUp}
        meta={[
          { label: "Status", value: "Upload required" },
          { label: "Source", value: "Health Overview" },
        ]}
      />
      <EmptyStateCard
        icon={FileUp}
        title="Lab reports required"
        description="This section uses data from your uploaded lab files. Upload at least one report from Health Overview first. After upload, charts and recommendations can be tied to your results."
        action={
          <Button asChild className={portalPrimaryButtonClass}>
            <Link to="/patient">Go to Health Overview</Link>
          </Button>
        }
      />
    </PatientPortalPage>
  );
}
