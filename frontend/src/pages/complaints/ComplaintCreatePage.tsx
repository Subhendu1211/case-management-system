import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { useMe } from "../../lib/queries/auth.queries";
import { adminNav } from "../admin/AdminShell";
import { ComplaintForm } from "../../components/complaints/ComplaintForm";
import { useDisabilityTypes } from "../../lib/queries/disabilityTypes.queries";
import { navForRole } from "../admin/AdminShell";
import { districts } from "../../lib/constants/districts";
import type { CreatedBySource, PartyType } from "../../lib/types";

const partyTypes: PartyType[] = ["INDIVIDUAL", "ORGANIZATION"];
const channels = [
  "EMAIL",
  "PHONE",
  "IN_PERSON",
  "LETTER",
  "ONLINE_PORTAL",
] as const;
const createdBySources: CreatedBySource[] = [
  "SELF",
  "DISTRICT_DEPARTMENT_OFFICER",
  "OTHER",
];

export function ComplaintCreatePage() {
  const me = useMe();
  const nav = useNavigate();

  const navItems =
    me.data?.user.role === "ADMIN" || me.data?.user.role === "PROGRAMMER"
      ? adminNav
      : me.data?.user.role === "CITIZEN"
        ? [
            { to: "/profile", label: "Profile" },
            { to: "/complaints", label: "Complaints" },
            { to: "/cases", label: "Cases" },
          ]
        : [
            { to: "/dashboard", label: "Dashboard" },
            { to: "/complaints", label: "Complaints" },
            { to: "/cases", label: "Cases" },
            { to: "/issue-register", label: "Issue register" },
          ];

  return (
    <AppShell title="Create Complaint" nav={navItems}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Create Complaint</h1>
      </div>
      <ComplaintForm />
    </AppShell>
  );
}
