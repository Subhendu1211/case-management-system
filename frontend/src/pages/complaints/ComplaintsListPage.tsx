import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { Input } from "../../components/Input";
import { Table, type Column } from "../../components/Table";
import { Button } from "../../components/Button";
import type { ComplaintListItem } from "../../lib/types";
import { useComplaints } from "../../lib/queries/complaints.queries";
import { useMe } from "../../lib/queries/auth.queries";
import { adminNav } from "../admin/AdminShell";
import { ComplaintForm } from "../../components/complaints/ComplaintForm";

export function ComplaintsListPage() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [diary, setDiary] = useState<"missing" | "created" | "all">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const me = useMe();
  const isCitizen = me.data?.user.role === "CITIZEN";
  const [view, setView] = useState<"form" | "list">(
    isCitizen ? "form" : "list",
  );

  const navItems =
    me.data?.user.role === "ADMIN" || me.data?.user.role === "PROGRAMMER"
      ? adminNav
      : isCitizen
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

  const complaints = useComplaints({
    q: q || undefined,
    diary,
    page,
    pageSize,
  });

  const columns = useMemo<Column<ComplaintListItem>[]>(
    () => [
      { key: "referenceNo", header: "Reference", cell: (r) => r.referenceNo },
      { key: "name", header: "Complainant", cell: (r) => r.name },
      { key: "district", header: "District", cell: (r) => r.district },
      {
        key: "disabilityType",
        header: "Disability",
        cell: (r) => r.disabilityType?.name ?? "—",
      },
      { key: "subject", header: "Subject", cell: (r) => r.subject },
      { key: "channel", header: "Channel", cell: (r) => r.channel },
      {
        key: "diary",
        header: "Diary",
        cell: (r) =>
          r.linkedCaseId ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              Created
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800">
              Pending
            </span>
          ),
      },
      {
        key: "createdAt",
        header: "Created",
        cell: (r) => new Date(r.createdAt).toLocaleString(),
      },
    ],
    [],
  );

  return (
    <AppShell title="Complaints" nav={navItems}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">
          {view === "form" ? "Create Complaint" : "Complaints"}
        </h1>
        <div className="flex gap-2">
          {isCitizen ? (
            view === "form" ? (
              <Button variant="secondary" onClick={() => setView("list")}>
                View My Complaints
              </Button>
            ) : (
              <Button onClick={() => setView("form")}>New Complaint</Button>
            )
          ) : null}

          {view === "list" && (
            <>
              <button
                className={
                  "rounded-lg px-3 py-2 text-sm " +
                  (diary === "all"
                    ? "bg-brand-600 text-white"
                    : "bg-neutral-100 text-neutral-900")
                }
                onClick={() => {
                  setDiary("all");
                  setPage(1);
                }}
              >
                All
              </button>
              <button
                className={
                  "rounded-lg px-3 py-2 text-sm " +
                  (diary === "missing"
                    ? "bg-brand-600 text-white"
                    : "bg-neutral-100 text-neutral-900")
                }
                onClick={() => {
                  setDiary("missing");
                  setPage(1);
                }}
              >
                Diary pending
              </button>
              <button
                className={
                  "rounded-lg px-3 py-2 text-sm " +
                  (diary === "created"
                    ? "bg-brand-600 text-white"
                    : "bg-neutral-100 text-neutral-900")
                }
                onClick={() => {
                  setDiary("created");
                  setPage(1);
                }}
              >
                Diary created
              </button>
              {/* For non-citizens, show legacy Create button if needed, but for now assuming only citizen flow was requested changed */}
              {!isCitizen && (
                <Button onClick={() => nav("/complaints/new")}>
                  Create Complaint
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {view === "form" ? (
        <div className="mt-4">
          <ComplaintForm onSuccess={() => setView("list")} />
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              label="Search"
              placeholder="reference / complainant / subject"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="mt-4">
            {complaints.isLoading ? (
              <div className="p-4" role="status" aria-live="polite">
                Loading…
              </div>
            ) : null}
            {complaints.error ? (
              <div className="p-4 text-semantic-danger">
                {(complaints.error as any).message}
              </div>
            ) : null}
            {complaints.data ? (
              <Table
                caption="Complaints"
                ariaLabel="Complaints table"
                columns={columns}
                rows={complaints.data.items}
                getRowKey={(r) => r.id}
                rowAriaLabel={(r) => `Complaint ${r.referenceNo}`}
                onRowClick={(row) => nav(`/complaints/${row.id}`)}
              />
            ) : null}
          </div>

          {complaints.data ? (
            <div className="mt-4 flex items-center gap-3">
              <button
                className="rounded-lg bg-neutral-100 px-3 py-2 text-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </button>
              <div className="text-sm text-neutral-700">
                Page {complaints.data.page} /{" "}
                {Math.max(
                  1,
                  Math.ceil(complaints.data.total / complaints.data.pageSize),
                )}
              </div>
              <button
                className="rounded-lg bg-neutral-100 px-3 py-2 text-sm"
                disabled={
                  page >=
                  Math.ceil(complaints.data.total / complaints.data.pageSize)
                }
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </AppShell>
  );
}