import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Modal } from "../../components/Modal";
import { api, downloadFile, resolveFileUrl } from "../../lib/api";
import {
  useComplaint,
  useUpdateComplaint,
} from "../../lib/queries/complaints.queries";
import { useMe } from "../../lib/queries/auth.queries";
import { navForRole } from "../admin/AdminShell";
import { districts } from "../../lib/constants/districts";
import type { ComplaintDocument, CreatedBySource, PartyType } from "../../lib/types";

export function ComplaintDetailPage() {
  const nav = useNavigate();
  const { complaintId } = useParams();
  const id = String(complaintId);
  const complaint = useComplaint(id);
  const me = useMe();
  const isCitizen = me.data?.user.role === "CITIZEN";

  const navItems = navForRole(me.data?.user.role);

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

  const canEdit =
    me.data?.user.role === "ADMIN" ||
    me.data?.user.role === "PRIVATE_SECRETARY";
  const update = useUpdateComplaint();
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    subject: "",
    description: "",
    channel: "EMAIL" as (typeof channels)[number],
    createdBySource: "SELF" as CreatedBySource,
    createdByOtherName: "",
    complainantType: "INDIVIDUAL" as PartyType,
    contact: "",
    district: (districts[0] ?? "") as string,
    complainantAddressLine1: "",
    complainantAddressLine2: "",
    complainantCity: "",
    complainantState: "",
    complainantPostalCode: "",
    accusedName: "",
    accusedType: "ORGANIZATION" as PartyType,
    accusedAddressLine1: "",
    accusedAddressLine2: "",
    accusedDistrict: (districts[0] ?? "") as string,
    accusedCity: "",
    accusedState: "",
    accusedPostalCode: "",
    disabilityTypeId: "",
  });

  const [openDiary, setOpenDiary] = useState(false);
  const [caseYear, setCaseYear] = useState<number>(() =>
    new Date().getFullYear(),
  );
  const [registrationNo, setRegistrationNo] = useState("");
  const [sectionAssigned, setSectionAssigned] = useState<
    "LEGAL" | "OE" | "REGISTRAR" | "STATIONERY" | "COMMISSIONER"
  >("COMMISSIONER");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!complaint.data) return;
    hydrateForm();
  }, [complaint.data]);

  const hydrateForm = () => {
    if (!complaint.data) return;
    setForm({
      name: complaint.data.name ?? "",
      subject: complaint.data.subject ?? "",
      description: complaint.data.description ?? "",
      channel: complaint.data.channel,
      createdBySource: complaint.data.createdBySource,
      createdByOtherName: complaint.data.createdByOtherName ?? "",
      complainantType: complaint.data.complainantType,
      contact: complaint.data.contact ?? "",
      district: (complaint.data.district ?? districts[0] ?? "") as string,
      complainantAddressLine1: complaint.data.complainantAddressLine1 ?? "",
      complainantAddressLine2: complaint.data.complainantAddressLine2 ?? "",
      complainantCity: complaint.data.complainantCity ?? "",
      complainantState: complaint.data.complainantState ?? "",
      complainantPostalCode: complaint.data.complainantPostalCode ?? "",
      accusedName: complaint.data.accusedName ?? "",
      accusedType: complaint.data.accusedType,
      accusedAddressLine1: complaint.data.accusedAddressLine1 ?? "",
      accusedAddressLine2: complaint.data.accusedAddressLine2 ?? "",
      accusedDistrict: (complaint.data.accusedDistrict ??
        districts[0] ??
        "") as string,
      accusedCity: complaint.data.accusedCity ?? "",
      accusedState: complaint.data.accusedState ?? "",
      accusedPostalCode: complaint.data.accusedPostalCode ?? "",
      disabilityTypeId: complaint.data.disabilityTypeId ?? "",
    });
  };

  const diaryAllowed = useMemo(() => {
    return (
      !isCitizen && Boolean(complaint.data) && !complaint.data?.linkedCaseId
    );
  }, [complaint.data, isCitizen]);
  const complaintDocuments = complaint.data?.documents ?? [];

  function friendlyError(err: any, fallback: string) {
    return err?.message ?? fallback;
  }

  async function downloadComplaintDocument(doc: ComplaintDocument) {
    setDocumentError(null);
    const resolvedUrl = resolveFileUrl(
      doc.downloadUrl ??
        `/api/v1/complaints/${doc.complaintId}/documents/${doc.id}/download`,
    );
    if (!resolvedUrl) {
      setDocumentError("Unable to resolve document URL.");
      return;
    }

    try {
      setDownloadingDocumentId(doc.id);
      const blob = await downloadFile(resolvedUrl);
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = doc.fileName || "document";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(objectUrl);
    } catch (e: any) {
      setDocumentError(friendlyError(e, "Unable to download document."));
    } finally {
      setDownloadingDocumentId((current) =>
        current === doc.id ? null : current,
      );
    }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!complaint.data) return;
    setSaveError(null);
    try {
      await update.mutateAsync({
        id,
        data: {
          ...form,
          createdByOtherName:
            form.createdBySource === "OTHER"
              ? form.createdByOtherName || undefined
              : undefined,
          disabilityTypeId: form.disabilityTypeId || undefined,
          complainantAddressLine2: form.complainantAddressLine2 || undefined,
          accusedAddressLine2: form.accusedAddressLine2 || undefined,
        },
      });
      setIsEditing(false);
    } catch (err: any) {
      setSaveError(err?.message ?? "Failed to update complaint");
    }
  }

  async function submitDiary() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await api<{ case: { caseYear: number; id: string } }>(
        "POST",
        `/complaints/${id}/diary`,
        {
          caseYear,
          registrationNo,
          sectionAssigned,
        },
      );
      setOpenDiary(false);
      nav(`/cases/${result.case.caseYear}/${result.case.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Complaint" nav={navItems}>
      <h1 className="text-xl font-semibold">Complaint detail</h1>
      {complaint.isLoading ? (
        <div className="mt-4" role="status" aria-live="polite">
          Loading…
        </div>
      ) : null}
      {complaint.error ? (
        <div className="mt-4 text-semantic-danger">
          {(complaint.error as any).message}
        </div>
      ) : null}

      {complaint.data ? (
        <div className="mt-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-neutral-700">
                {complaint.data.referenceNo}
              </div>
              <div className="text-lg font-semibold">
                {complaint.data.subject}
              </div>
              <div className="text-sm text-neutral-700">
                Complainant:{" "}
                <span className="font-medium">{complaint.data.name}</span> ·
                Channel{" "}
                <span className="font-medium">{complaint.data.channel}</span>
                {complaint.data.district ? (
                  <>
                    {" "}
                    · District{" "}
                    <span className="font-medium">
                      {complaint.data.district}
                    </span>
                  </>
                ) : null}
                {complaint.data.disabilityType ? (
                  <>
                    {" "}
                    · Disability{" "}
                    <span className="font-medium">
                      {complaint.data.disabilityType.name}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            {canEdit ? (
              isEditing ? (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSaveError(null);
                      hydrateForm();
                      setIsEditing(false);
                    }}
                    disabled={update.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    form="complaint-edit-form"
                    type="submit"
                    disabled={update.isPending}
                  >
                    {update.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    setSaveError(null);
                    hydrateForm();
                    setIsEditing(true);
                  }}
                >
                  Edit
                </Button>
              )
            ) : null}
          </div>

          {saveError ? (
            <div
              className="rounded-lg bg-semantic-danger/10 p-3 text-sm text-semantic-danger"
              role="alert"
              aria-live="assertive"
            >
              {saveError}
            </div>
          ) : null}

          {isEditing ? (
            <form
              id="complaint-edit-form"
              className="glass-card space-y-4 p-4"
              onSubmit={saveEdit}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Subject"
                  value={form.subject}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
                  required
                />
                <label className="flex flex-col gap-2 text-sm font-medium">
                  <span>Channel</span>
                  <select
                    className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600"
                    value={form.channel}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, channel: e.target.value as any }))
                    }
                    required
                  >
                    {channels.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  <span>Created by</span>
                  <select
                    className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600"
                    value={form.createdBySource}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        createdBySource: e.target.value as CreatedBySource,
                      }))
                    }
                    required
                  >
                    {createdBySources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </label>
                {form.createdBySource === "OTHER" ? (
                  <Input
                    label="Creator name (when Other)"
                    value={form.createdByOtherName}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        createdByOtherName: e.target.value,
                      }))
                    }
                    required
                  />
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Complainant name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                />
                <label className="flex flex-col gap-2 text-sm font-medium">
                  <span>Complainant type</span>
                  <select
                    className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600"
                    value={form.complainantType}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        complainantType: e.target.value as PartyType,
                      }))
                    }
                    required
                  >
                    {partyTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Contact"
                  value={form.contact}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contact: e.target.value }))
                  }
                />
                <label className="flex flex-col gap-2 text-sm font-medium">
                  <span>Complainant district</span>
                  <select
                    className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600"
                    value={form.district}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, district: e.target.value }))
                    }
                    required
                  >
                    {districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Complainant address line 1"
                  value={form.complainantAddressLine1}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      complainantAddressLine1: e.target.value,
                    }))
                  }
                  required
                />
                <Input
                  label="Complainant address line 2"
                  value={form.complainantAddressLine2}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      complainantAddressLine2: e.target.value,
                    }))
                  }
                />
                <Input
                  label="Complainant city"
                  value={form.complainantCity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, complainantCity: e.target.value }))
                  }
                  required
                />
                <Input
                  label="Complainant state"
                  value={form.complainantState}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, complainantState: e.target.value }))
                  }
                  required
                />
                <Input
                  label="Complainant postal code"
                  value={form.complainantPostalCode}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      complainantPostalCode: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <section className="rounded-lg border border-neutral-200 p-4">
                <header className="mb-3 text-sm font-semibold">
                  Accused (Second Party)
                </header>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Accused name"
                    value={form.accusedName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, accusedName: e.target.value }))
                    }
                    required
                  />
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    <span>Accused type</span>
                    <select
                      className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600"
                      value={form.accusedType}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          accusedType: e.target.value as PartyType,
                        }))
                      }
                      required
                    >
                      {partyTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input
                    label="Accused address line 1"
                    value={form.accusedAddressLine1}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        accusedAddressLine1: e.target.value,
                      }))
                    }
                    required
                  />
                  <Input
                    label="Accused address line 2"
                    value={form.accusedAddressLine2}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        accusedAddressLine2: e.target.value,
                      }))
                    }
                  />
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    <span>Accused district</span>
                    <select
                      className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-600"
                      value={form.accusedDistrict}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          accusedDistrict: e.target.value,
                        }))
                      }
                      required
                    >
                      {districts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input
                    label="Accused city"
                    value={form.accusedCity}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, accusedCity: e.target.value }))
                    }
                    required
                  />
                  <Input
                    label="Accused state"
                    value={form.accusedState}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, accusedState: e.target.value }))
                    }
                    required
                  />
                  <Input
                    label="Accused postal code"
                    value={form.accusedPostalCode}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        accusedPostalCode: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </section>

              <div className="grid grid-cols-1 gap-4">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  <span>Description</span>
                  <textarea
                    className="min-h-[120px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600"
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    required
                  />
                </label>
              </div>
            </form>
          ) : (
            <div className="glass-card p-4">
              <div className="mt-3 grid grid-cols-1 gap-4 text-sm text-neutral-800 md:grid-cols-2">
                <div className="rounded-lg border border-neutral-200 p-3">
                  <div className="font-semibold">Complainant</div>
                  <div className="mt-1 text-neutral-700">
                    {complaint.data.complainantType}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-neutral-800">
                    {complaint.data.complainantAddressLine1}
                    {complaint.data.complainantAddressLine2
                      ? `\n${complaint.data.complainantAddressLine2}`
                      : ""}
                    {`
					${complaint.data.district ? `${complaint.data.district}, ` : ""}${complaint.data.complainantCity}, ${complaint.data.complainantState} ${complaint.data.complainantPostalCode}`}
                  </div>
                </div>
                <div className="rounded-lg border border-neutral-200 p-3">
                  <div className="font-semibold">Accused</div>
                  <div className="mt-1 text-neutral-700">
                    {complaint.data.accusedType}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-neutral-800">
                    {complaint.data.accusedAddressLine1}
                    {complaint.data.accusedAddressLine2
                      ? `\n${complaint.data.accusedAddressLine2}`
                      : ""}
                    {`
					${complaint.data.accusedDistrict ? `${complaint.data.accusedDistrict}, ` : ""}${complaint.data.accusedCity}, ${complaint.data.accusedState} ${complaint.data.accusedPostalCode}`}
                  </div>
                </div>
              </div>
              <div className="mt-3 whitespace-pre-wrap text-sm text-neutral-900">
                {complaint.data.description}
              </div>
              <div className="mt-4 rounded-lg border border-neutral-200 p-3">
                <div className="text-sm font-semibold text-neutral-900">
                  Supporting documents
                </div>
                <div className="mt-1 text-xs text-neutral-700">
                  Review these attachments before creating the diary entry.
                </div>
                {documentError ? (
                  <div
                    className="mt-2 rounded-lg bg-semantic-danger/10 p-2 text-xs text-semantic-danger"
                    role="alert"
                  >
                    {documentError}
                  </div>
                ) : null}
                <div className="mt-3 space-y-2">
                  {complaintDocuments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-neutral-200 p-3 text-sm text-neutral-700">
                      No supporting documents uploaded.
                    </div>
                  ) : (
                    complaintDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-neutral-200 p-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-neutral-900">
                            {doc.fileName}
                          </div>
                          <div className="mt-1 text-xs text-neutral-700">
                            {(doc.sizeBytes / 1024).toFixed(1)} KB
                            {doc.uploadedBy?.name
                              ? ` • uploaded by ${doc.uploadedBy.name}`
                              : ""}
                            {doc.createdAt
                              ? ` • ${new Date(doc.createdAt).toLocaleString()}`
                              : ""}
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => downloadComplaintDocument(doc)}
                          disabled={downloadingDocumentId === doc.id}
                        >
                          {downloadingDocumentId === doc.id
                            ? "Opening..."
                            : "Open"}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                {complaint.data.linkedCaseId ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      nav(
                        `/cases/${complaint.data.linkedCaseYear}/${complaint.data.linkedCaseId}`,
                      )
                    }
                  >
                    Open linked case
                  </Button>
                ) : !isCitizen ? (
                  <Button
                    onClick={() => setOpenDiary(true)}
                    disabled={!diaryAllowed}
                  >
                    Diary Entry
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {!isCitizen ? (
        <Modal
          open={openDiary}
          title="Diary Entry"
          onClose={() => setOpenDiary(false)}
        >
          <div className="space-y-3">
            {error ? (
              <div
                className="rounded-lg bg-semantic-danger/10 p-3 text-sm text-semantic-danger"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            ) : null}
            <div className="rounded-lg border border-neutral-200 p-3">
              <div className="text-sm font-semibold text-neutral-900">
                Complaint documents
              </div>
              <div className="mt-2 space-y-2">
                {complaintDocuments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-neutral-200 p-2 text-sm text-neutral-700">
                    No supporting documents uploaded.
                  </div>
                ) : (
                  complaintDocuments.map((doc) => (
                    <div
                      key={`diary-${doc.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 p-2"
                    >
                      <div className="min-w-0 truncate text-sm text-neutral-900">
                        {doc.fileName}
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => downloadComplaintDocument(doc)}
                        disabled={downloadingDocumentId === doc.id}
                      >
                        {downloadingDocumentId === doc.id
                          ? "Opening..."
                          : "Open"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <Input
              label="Case year"
              value={String(caseYear)}
              onChange={(e) => setCaseYear(Number(e.target.value))}
            />
            <Input
              label="Registration no"
              placeholder="e.g. 001/2026"
              value={registrationNo}
              onChange={(e) => setRegistrationNo(e.target.value)}
            />
            <label className="block text-xs font-medium text-neutral-700">
              Section assigned
              <select
                className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm"
                value={sectionAssigned}
                onChange={(e) => setSectionAssigned(e.target.value as any)}
              >
                <option value="COMMISSIONER">COMMISSIONER</option>
                <option value="LEGAL">LEGAL</option>
                <option value="OE">OE</option>
                <option value="REGISTRAR">REGISTRAR</option>
                <option value="STATIONERY">STATIONERY</option>
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setOpenDiary(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={submitDiary}
                disabled={submitting || !registrationNo}
              >
                {submitting ? "Submitting…" : "Create case"}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </AppShell>
  );
}
