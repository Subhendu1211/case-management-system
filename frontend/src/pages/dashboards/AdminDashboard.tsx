import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { KpiCard } from "../../components/KpiCard";
import {
  useCaseSummary,
  useDashboardCards,
  useRolePendency,
  useProcessingHouseCount
} from "../../lib/queries/dashboard.queries";
import { AdminShell } from "../admin/AdminShell";
import type { CaseStatus } from "../../lib/types";
import { formatCaseStatus } from "../../lib/formatters";

const caseTypes = [
  { label: "Physical", value: 110 },
  { label: "Mental", value: 75 },
  { label: "Sensory", value: 60 },
  { label: "Intellectual", value: 55 },
  { label: "Psychosocial", value: 50 },
];

const statusColors: Record<CaseStatus, string> = {
  DRAFT: "#8e44ad", DIARY_ENTERED: "#1f9c3f", REGISTERED: "#3498db",
  UNDER_REVIEW: "#f39c12", ROUTED_TO_LEGAL: "#9b59b6", ROUTED_TO_OE: "#16a085",
  NOT_RELATED: "#95a5a6", ORDER_SHEET_DRAFTED: "#e67e22", REGISTRAR_REVIEW: "#d35400",
  COMMISSIONER_APPROVAL: "#2980b9", APPROVED: "#27ae60", LEGAL_FORWARDING: "#6c5ce7",
  DISPATCH_PENDING: "#f1c40f", DISPATCHED: "#2ecc71", CLOSED: "#c0392b",
  REVIEW_DONE: "#3498db", CASE_ACCEPTED: "#27ae60", PENDING_QUERY: "#f39c12",
  PS_POST_ACCEPTANCE: "#00b894", PA_INITIAL_REVIEW: "#00cec9", PROGRAMMER_REVIEW: "#6c5ce7", STATIONERY_REVIEW: "#fd79a8",
  REGISTRAR_FINAL_REVIEW: "#e17055", REGISTRAR_INITIAL_REVIEW: "#0984e3",
  PA_TO_COMMISSIONER: "#a29bfe", PA_POST_APPROVAL: "#55efc4",
  REGISTRAR_HANDOVER: "#fab1a0", FORWARDING_STATIONERY: "#fdcb6e",
  REGISTRAR_SIGNING: "#e17055",
};

const statusOrder: CaseStatus[] = [
  "DIARY_ENTERED", "UNDER_REVIEW", "CASE_ACCEPTED", "PS_POST_ACCEPTANCE",
  "ROUTED_TO_LEGAL", "REGISTRAR_INITIAL_REVIEW", "PROGRAMMER_REVIEW",
  "STATIONERY_REVIEW", "REGISTERED", "ORDER_SHEET_DRAFTED", "REGISTRAR_REVIEW",
  "PA_TO_COMMISSIONER", "COMMISSIONER_APPROVAL", "APPROVED", "PA_POST_APPROVAL",
  "REGISTRAR_HANDOVER", "LEGAL_FORWARDING", "FORWARDING_STATIONERY",
  "REGISTRAR_SIGNING", "DISPATCH_PENDING", "CLOSED", "DRAFT", "NOT_RELATED",
];

const stateSeries = [
  { label: "Region A", value: 22 }, { label: "Region B", value: 16 },
  { label: "Region C", value: 14 }, { label: "Region D", value: 11 }, { label: "Region E", value: 8 },
];

const groupedCases = [
  { department: "Finance Dept.", cases: [{ id: "C001", title: "Fraud Investigation – Misuse of Disability Pension Funds", type: "Physical", status: "Open", officer: "John Doe" }] },
  { department: "IT Dept.", cases: [{ id: "C002", title: "Cybersecurity Breach – Exposure of Mental Health Records", type: "Mental", status: "Open", officer: "Jane Smith" }] },
  { department: "HR Dept.", cases: [{ id: "C003", title: "Harassment Complaint – Employee with Sensory Impairment", type: "Sensory", status: "Open", officer: "Emily Clark" }] },
];

const unassignedCases = [
  { id: "C004", title: "Unlawful Termination – Employee with Intellectual Disability", type: "Intellectual" },
  { id: "C005", title: "Budget Misallocation – Impacting Psychosocial Disability Support", type: "Psychosocial" },
];

function SvgIcon({ d }: { d: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function Card({ title, iconD, children }: { title: string; iconD: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-neutral-100 px-5 py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
          <SvgIcon d={iconD} />
        </div>
        <span className="text-sm font-semibold text-neutral-800">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function AdminDashboard() {
  const cards = useDashboardCards();
  const rolePendency = useRolePendency();
  const caseSummary = useCaseSummary();
  const nav = useNavigate();
  const map = new Map((cards.data ?? []).map((c) => [c.card_key, c.value]));
  const processingHouse = useProcessingHouseCount();

  const maxCaseType = useMemo(() => Math.max(...caseTypes.map((c) => c.value)), []);
  const maxState = useMemo(() => Math.max(...stateSeries.map((p) => p.value)), []);

  const statusSeries = useMemo(() => {
    const counts = new Map<CaseStatus, number>();
    (caseSummary.data ?? []).forEach((row: any) => {
      const s = row.status as CaseStatus;
      counts.set(s, (counts.get(s) || 0) + (Number(row.count) || 0));
    });
    const items = statusOrder.filter((s) => (counts.get(s) || 0) > 0)
      .map((status) => ({ status, label: status.replace(/_/g, " "), value: counts.get(status) || 0, color: statusColors[status] }));
    return items.length ? items : [
      { status: "DIARY_ENTERED" as CaseStatus, label: "Diary Entered", value: 0, color: statusColors.DIARY_ENTERED },
      { status: "UNDER_REVIEW" as CaseStatus, label: "Under Review", value: 0, color: statusColors.UNDER_REVIEW },
      { status: "CLOSED" as CaseStatus, label: "Closed", value: 0, color: statusColors.CLOSED },
    ];
  }, [caseSummary.data]);

  const totalStatus = useMemo(() => statusSeries.reduce((a, s) => a + s.value, 0), [statusSeries]);
  const maxRoleCount = useMemo(() => Math.max(1, ...(rolePendency.data ?? []).map((r) => Number(r.count) || 0)), [rolePendency.data]);

  return (
    <AdminShell title="Admin Dashboard">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">System Overview</h2>
          <p className="mt-0.5 text-sm text-neutral-500">Live statistics &mdash; SCPD Case Management Portal</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-neutral-400">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Live
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Open Cases" value={map.get("open_cases") ?? "—"} color="blue" sublabel="Currently active"
          icon={<SvgIcon d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />}
        />
        <KpiCard label="New Cases (30 days)" value={map.get("new_cases_30d") ?? "—"} color="green" sublabel="Last 30 days"
          icon={<SvgIcon d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />
        <KpiCard label="Legal SLA Breaches" value={map.get("legal_sla_breaches") ?? "—"} color="red" sublabel="Requires attention"
          icon={<SvgIcon d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />}
        />
        <KpiCard label="Processing house" value={processingHouse.data?.processing_house ?? '—'} />
      </div>

      {/* Pendency by role */}
      <div className="mt-5">
        <Card title="Pending Cases by Role" iconD="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {rolePendency.isLoading && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-center">
                <div className="flex h-28 w-full items-end justify-center">
                  <div className="w-10 animate-pulse rounded-t-lg bg-neutral-200" style={{ height: `${50 + i * 15}px` }} />
                </div>
                <div className="h-3 w-20 animate-pulse rounded bg-neutral-200" />
                <div className="h-5 w-10 animate-pulse rounded bg-neutral-200" />
              </div>
            ))}
            {(rolePendency.data ?? []).map((r) => (
              <div key={r.role} className="flex flex-col items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-center">
                <div className="flex h-28 w-full items-end justify-center">
                  <div
                    className="w-10 rounded-t-lg transition-[height] duration-500"
                    style={{ height: `${((Number(r.count) || 0) / maxRoleCount) * 112 + 8}px`, background: 'rgb(var(--color-gov-blue))' }}
                    aria-label={`${r.role.replace(/_/g, ' ')}: ${r.count}`}
                    role="img"
                  />
                </div>
                <div className="text-xs font-semibold text-neutral-600">{r.role.replace(/_/g, ' ')}</div>
                <div className="text-xl font-bold text-neutral-900">{r.count}</div>
              </div>
            ))}
            {!rolePendency.isLoading && (rolePendency.data ?? []).length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-400">
                No pending cases yet.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Disability types */}
        <Card title="Disability Case Types" iconD="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.355a14.995 14.995 0 01-4.5 0M12 3.75a.75.75 0 110-1.5.75.75 0 010 1.5zm4.5 3.947c0 2.486-2.015 4.5-4.5 4.5s-4.5-2.014-4.5-4.5a4.5 4.5 0 119 0z">
          <div className="flex items-end gap-2">
            {caseTypes.map((c) => (
              <div key={c.label} className="flex flex-1 flex-col items-center gap-1 text-xs text-neutral-500">
                <span className="font-bold text-neutral-900">{c.value}</span>
                <div
                  className="w-full rounded-t-md"
                  style={{ height: `${(c.value / maxCaseType) * 120}px`, background: 'rgb(var(--color-gov-blue))' }}
                  aria-label={`${c.label}: ${c.value}`}
                  role="img"
                />
                <span className="text-center leading-tight">{c.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Status donut */}
        <Card title="Case Status Distribution" iconD="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z">
          <div className="flex flex-col items-center gap-4">
            {totalStatus > 0 ? (
              <div
                role="img"
                aria-label="Case status donut chart"
                className="relative h-44 w-44 rounded-full"
                style={{ background: `conic-gradient(${statusSeries.map((s, idx) => { const start = statusSeries.slice(0, idx).reduce((a, p) => a + p.value, 0); const end = start + s.value; return `${s.color} ${(start / totalStatus) * 360}deg ${(end / totalStatus) * 360}deg`; }).join(", ")})` }}
              >
                <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
                  <span className="text-2xl font-bold text-neutral-900">{totalStatus}</span>
                  <span className="text-[10px] text-neutral-400">Total</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-neutral-50 py-8 text-center text-sm text-neutral-400">No data yet.</div>
            )}
            <ul className="w-full space-y-1 text-xs">
              {statusSeries.map((s) => (
                <li key={s.status}>
                  <button type="button" onClick={() => nav(`/cases?status=${encodeURIComponent(s.status)}`)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gov-blue">
                    <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="flex-1 capitalize text-neutral-600">{s.label.toLowerCase()}</span>
                    <span className="font-semibold text-neutral-900">{s.value}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Regional line */}
        <Card title="Regional Distribution" iconD="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941">
          <svg viewBox="0 0 240 160" className="h-52 w-full" role="img" aria-label="Cases by region">
            {[0, 40, 80, 120].map((y) => <line key={y} x1="20" y1={y + 10} x2="230" y2={y + 10} stroke="#f1f5f9" strokeWidth="1" />)}
            <defs>
              <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--color-gov-blue))" stopOpacity="0.2" />
                <stop offset="100%" stopColor="rgb(var(--color-gov-blue))" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polygon fill="url(#rg)"
              points={[
                ...stateSeries.map((p, i) => { const x = 20 + (i * 210) / (stateSeries.length - 1); const y = 130 - (p.value / maxState) * 110; return `${x},${y}`; }),
                `${20 + 210},130`, '20,130',
              ].join(' ')}
            />
            <polyline fill="none" stroke="rgb(var(--color-gov-blue))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              points={stateSeries.map((p, i) => { const x = 20 + (i * 210) / (stateSeries.length - 1); const y = 130 - (p.value / maxState) * 110; return `${x},${y}`; }).join(' ')}
            />
            {stateSeries.map((p, i) => {
              const x = 20 + (i * 210) / (stateSeries.length - 1);
              const y = 130 - (p.value / maxState) * 110;
              return (
                <g key={p.label}>
                  <circle cx={x} cy={y} r="5" fill="white" stroke="rgb(var(--color-gov-blue))" strokeWidth="2" />
                  <text x={x} y={148} textAnchor="middle" fontSize="9" fill="#64748b">{p.label}</text>
                  <text x={x} y={y - 9} textAnchor="middle" fontSize="9" fontWeight="600" fill="rgb(var(--color-gov-blue))">{p.value}</text>
                </g>
              );
            })}
          </svg>
        </Card>
      </div>

      {/* Bottom tables */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Cases by dept */}
        <Card title="Current Cases by Department" iconD="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z">
          <div className="space-y-4">
            {groupedCases.map((dept) => (
              <div key={dept.department} className="overflow-hidden rounded-lg border border-neutral-200">
                <div className="px-4 py-2.5 text-xs font-semibold text-white" style={{ background: 'rgb(var(--color-gov-blue))' }}>
                  {dept.department}
                </div>
                <table className="w-full text-xs" aria-label={`${dept.department} cases`}>
                  <thead className="bg-neutral-50 text-left text-neutral-500">
                    <tr>
                      {['ID', 'Title', 'Type', 'Officer'].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {dept.cases.map((c) => (
                      <tr key={c.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                        <td className="px-3 py-2.5 font-semibold text-gov-blue">{c.id}</td>
                        <td className="px-3 py-2.5 text-neutral-700">{c.title}</td>
                        <td className="px-3 py-2.5 text-neutral-500">{c.type}</td>
                        <td className="px-3 py-2.5 text-neutral-700">{c.officer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Card>

        {/* Unassigned */}
        <Card title="Unassigned Cases — Action Required" iconD="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z">
          <div className="overflow-auto">
            <table className="w-full min-w-[440px] text-xs" aria-label="Unassigned cases">
              <thead className="bg-neutral-50 text-left text-neutral-500">
                <tr>
                  {['ID', 'Title', 'Type', 'Actions'].map((h) => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {unassignedCases.map((c) => (
                  <tr key={c.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-3 py-3 font-semibold text-gov-blue">{c.id}</td>
                    <td className="px-3 py-3 text-neutral-700">{c.title}</td>
                    <td className="px-3 py-3 text-neutral-500">{c.type}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">Approve</button>
                        <button type="button" className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100">Reject</button>
                        <button type="button" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">Forward</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
