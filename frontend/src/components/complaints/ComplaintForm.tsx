import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../Input";
import { Button } from "../Button";
import {
  useCreateComplaint,
  useUploadComplaintDocuments,
} from "../../lib/queries/complaints.queries";
import { useMe } from "../../lib/queries/auth.queries";
import { useDisabilityTypes } from "../../lib/queries/disabilityTypes.queries";
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

export function ComplaintForm({ onSuccess }: { onSuccess?: () => void }) {
  const nav = useNavigate();
  const create = useCreateComplaint();
  const uploadDocs = useUploadComplaintDocuments();
  const disabilityTypes = useDisabilityTypes();
  const me = useMe();

  const [form, setForm] = useState({
    referenceNo: "",
    disabilityOther: "",
    name: "",
    createdBySource: "SELF" as CreatedBySource,
    createdByOtherName: "",
    complainantType: "INDIVIDUAL" as PartyType,
    contact: "",
    district: (districts[0] ?? "") as string,
    complainantAddressLine1: "",
    complainantAddressLine2: "",
    complainantBlock: "",
    complainantPoliceStation: "",
    complainantPostOffice: "",
    complainantCity: "",
    complainantState: "",
    complainantPostalCode: "",
    accusedName: "",
    accusedType: "ORGANIZATION" as PartyType,
    accusedAddressLine1: "",
    accusedAddressLine2: "",
    accusedBlock: "",
    accusedPoliceStation: "",
    accusedPostOffice: "",
    accusedDistrict: (districts[0] ?? "") as string,
    accusedCity: "",
    accusedState: "",
    accusedPostalCode: "",
    disabilityTypeId: "",
    subject: "",
    description: "",
    channel: "EMAIL" as (typeof channels)[number],
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);

  useEffect(() => {
    if (me.data?.user.role !== "CITIZEN") return;
    setForm((prev) => ({
      ...prev,
      createdBySource: "SELF",
      createdByOtherName: "",
      channel: "ONLINE_PORTAL",
    }));
  }, [me.data?.user.role]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attachments.length === 0) {
      setAttachmentsError("Please upload at least one supporting document.");
      return;
    }
    setAttachmentsError(null);

    let payloadForm: any = { ...form };
    if (form.disabilityOther && form.disabilityOther.trim()) {
      payloadForm = {
        ...payloadForm,
        description: `${form.description}\n\nDisability details: ${form.disabilityOther.trim()}`,
      };
    }

    const payload = {
      ...payloadForm,
      createdBySource:
        me.data?.user.role === "CITIZEN" ? "SELF" : form.createdBySource,
      channel:
        me.data?.user.role === "CITIZEN" ? "ONLINE_PORTAL" : form.channel,
      referenceNo: form.referenceNo || undefined,
      createdByOtherName:
        form.createdBySource === "OTHER"
          ? form.createdByOtherName || undefined
          : undefined,
      disabilityTypeId: form.disabilityTypeId || undefined,
      complainantAddressLine2: form.complainantAddressLine2 || undefined,
      complainantBlock: form.complainantBlock || undefined,
      complainantPoliceStation: form.complainantPoliceStation || undefined,
      complainantPostOffice: form.complainantPostOffice || undefined,
      accusedAddressLine2: form.accusedAddressLine2 || undefined,
      accusedBlock: form.accusedBlock || undefined,
      accusedPoliceStation: form.accusedPoliceStation || undefined,
      accusedPostOffice: form.accusedPostOffice || undefined,
      description: payloadForm.description,
    };
    try {
      const created = await create.mutateAsync(payload);
      if (created?.id) {
        await uploadDocs.mutateAsync({
          complaintId: created.id,
          files: attachments,
        });
      }
      if (onSuccess) {
        onSuccess();
      } else {
        if (created?.id) nav(`/complaints/${created.id}`);
        else nav("/complaints");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fieldClasses = "w-full";
  const selectClasses =
    "w-full h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[rgb(var(--color-gov-blue))] transition-all";
  const labelClasses =
    "flex flex-col gap-1.5 text-sm font-medium text-neutral-700";

  return (
    <form className="space-y-8 max-w-5xl mx-auto pb-12" onSubmit={onSubmit}>
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-bold text-[rgb(var(--color-gov-blue))]">
            Complaint Registration
          </h2>
          <p className="text-sm text-neutral-500">
            Please fill in the details of the complaint.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* General Information */}
          <section>
            <h3 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-2 mb-4 uppercase tracking-wider">
              General Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Reference No (optional)"
                value={form.referenceNo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, referenceNo: e.target.value }))
                }
                className={fieldClasses}
              />
              <Input
                label="Subject"
                value={form.subject}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value }))
                }
                required
                className={fieldClasses}
                placeholder="Brief subject of the complaint"
              />

              <label className={labelClasses}>
                <span>Channel</span>
                <select
                  className={selectClasses}
                  value={form.channel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, channel: e.target.value as any }))
                  }
                  disabled={me.data?.user.role === "CITIZEN"}
                  required
                >
                  {channels.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>

              <label className={labelClasses}>
                <span>Disability Type (Optional)</span>
                <select
                  className={selectClasses}
                  value={form.disabilityTypeId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, disabilityTypeId: e.target.value }))
                  }
                  disabled={disabilityTypes.isLoading}
                >
                  <option value="">Not specified</option>
                  {disabilityTypes.data?.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* Dynamic Other Disability Field */}
              {(() => {
                const selected = disabilityTypes.data?.find(
                  (d) => d.id === form.disabilityTypeId,
                );
                const showOther =
                  selected &&
                  (/multiple/i.test(selected.name) ||
                    /other/i.test(selected.name));
                return showOther ? (
                  <div className="md:col-span-2">
                    <Input
                      label={
                        selected?.name?.toLowerCase().includes("other")
                          ? "Please specify disability"
                          : "Specify disabilities"
                      }
                      value={form.disabilityOther}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          disabilityOther: e.target.value,
                        }))
                      }
                      className={fieldClasses}
                    />
                  </div>
                ) : null;
              })()}

              {/* Source Information - Only for Officers */}
              {me.data?.user.role !== "CITIZEN" && (
                <>
                  <label className={labelClasses}>
                    <span>Complaint Filed By</span>
                    <select
                      className={selectClasses}
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
                          {source.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  {form.createdBySource === "OTHER" && (
                    <Input
                      label="Creator Name"
                      value={form.createdByOtherName}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          createdByOtherName: e.target.value,
                        }))
                      }
                      required
                      className={fieldClasses}
                    />
                  )}
                </>
              )}
            </div>
            <div className="mt-6">
              <label className={labelClasses}>
                <span>Complaint / Grievance Details</span>
                <textarea
                  className="min-h-[150px] w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgb(var(--color-gov-blue))] transition-all"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  required
                  placeholder="Provide detailed description of the complaint..."
                />
              </label>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Complainant Section */}
            <section className="bg-neutral-50 p-5 rounded-lg border border-neutral-200">
              <h3 className="text-sm font-bold text-[rgb(var(--color-gov-blue))] border-b border-neutral-200 pb-2 mb-4 uppercase">
                Complainant (First Party)
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                  className="bg-white"
                />
                <div className="grid grid-cols-2 gap-4">
                  <label className={labelClasses}>
                    <span>Type</span>
                    <select
                      className={selectClasses}
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
                    className="bg-white"
                    placeholder="Phone / Email"
                  />
                </div>

                <Input
                  label="Address Line 1"
                  value={form.complainantAddressLine1}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      complainantAddressLine1: e.target.value,
                    }))
                  }
                  required
                  className="bg-white"
                />
                <Input
                  label="Address Line 2"
                  value={form.complainantAddressLine2}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      complainantAddressLine2: e.target.value,
                    }))
                  }
                  className="bg-white"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Block (Optional)"
                    value={form.complainantBlock}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        complainantBlock: e.target.value,
                      }))
                    }
                    className="bg-white"
                  />
                  <Input
                    label="Police Station (Optional)"
                    value={form.complainantPoliceStation}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        complainantPoliceStation: e.target.value,
                      }))
                    }
                    className="bg-white"
                  />
                </div>
                <Input
                  label="Post Office (Optional)"
                  value={form.complainantPostOffice}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      complainantPostOffice: e.target.value,
                    }))
                  }
                  className="bg-white"
                />
                <div className="grid grid-cols-2 gap-4">
                  <label className={labelClasses}>
                    <span>District</span>
                    <select
                      className={selectClasses}
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
                    label="City"
                    value={form.complainantCity}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        complainantCity: e.target.value,
                      }))
                    }
                    required
                    className="bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="State"
                    value={form.complainantState}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        complainantState: e.target.value,
                      }))
                    }
                    required
                    className="bg-white"
                  />
                  <Input
                    label="Postal Code"
                    value={form.complainantPostalCode}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        complainantPostalCode: e.target.value,
                      }))
                    }
                    required
                    className="bg-white"
                  />
                </div>
              </div>
            </section>

            {/* Accused Section */}
            <section className="bg-neutral-50 p-5 rounded-lg border border-neutral-200">
              <h3 className="text-sm font-bold text-red-700 border-b border-neutral-200 pb-2 mb-4 uppercase">
                Opposite Party (Respondent)
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Name"
                  value={form.accusedName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accusedName: e.target.value }))
                  }
                  required
                  className="bg-white"
                />
                <label className={labelClasses}>
                  <span>Type</span>
                  <select
                    className={selectClasses}
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
                  label="Address Line 1"
                  value={form.accusedAddressLine1}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      accusedAddressLine1: e.target.value,
                    }))
                  }
                  required
                  className="bg-white"
                />
                <Input
                  label="Address Line 2"
                  value={form.accusedAddressLine2}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      accusedAddressLine2: e.target.value,
                    }))
                  }
                  className="bg-white"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Block (Optional)"
                    value={form.accusedBlock}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        accusedBlock: e.target.value,
                      }))
                    }
                    className="bg-white"
                  />
                  <Input
                    label="Police Station (Optional)"
                    value={form.accusedPoliceStation}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        accusedPoliceStation: e.target.value,
                      }))
                    }
                    className="bg-white"
                  />
                </div>
                <Input
                  label="Post Office (Optional)"
                  value={form.accusedPostOffice}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      accusedPostOffice: e.target.value,
                    }))
                  }
                  className="bg-white"
                />
                <div className="grid grid-cols-2 gap-4">
                  <label className={labelClasses}>
                    <span>District</span>
                    <select
                      className={selectClasses}
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
                    label="City"
                    value={form.accusedCity}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, accusedCity: e.target.value }))
                    }
                    required
                    className="bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="State"
                    value={form.accusedState}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, accusedState: e.target.value }))
                    }
                    required
                    className="bg-white"
                  />
                  <Input
                    label="Postal Code"
                    value={form.accusedPostalCode}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        accusedPostalCode: e.target.value,
                      }))
                    }
                    required
                    className="bg-white"
                  />
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-lg border-2 border-dashed border-neutral-300 p-6 bg-neutral-50">
            <header className="mb-4 text-sm font-semibold text-neutral-700 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                />
              </svg>
              Supporting Documents
              <span className="text-red-600">*</span>
            </header>
            <div className="space-y-4">
              <label className="flex flex-col gap-2 cursor-pointer group">
                <div className="flex flex-col items-center justify-center py-4 border border-neutral-300 rounded-lg bg-white group-hover:border-[rgb(var(--color-gov-blue))] transition-colors">
                  <span className="text-sm font-medium text-[rgb(var(--color-gov-blue))]">
                    Click to upload files
                  </span>
                  <span className="text-xs text-neutral-500">
                    PDF, Images (Max 5MB)
                  </span>
                </div>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const selectedFiles = Array.from(e.target.files ?? []);
                    if (selectedFiles.length === 0) return;
                    setAttachments((prev) => {
                      const existing = new Set(
                        prev.map((f) => `${f.name}::${f.size}::${f.lastModified}`),
                      );
                      const incoming = selectedFiles.filter(
                        (f) => !existing.has(`${f.name}::${f.size}::${f.lastModified}`),
                      );
                      return [...prev, ...incoming];
                    });
                    setAttachmentsError(null);
                    e.currentTarget.value = "";
                  }}
                />
              </label>

              {attachments.length > 0 && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachments.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                      className="flex items-center justify-between rounded bg-white border border-neutral-200 px-3 py-2 shadow-sm"
                    >
                      <span
                        className="truncate text-sm font-medium text-neutral-700"
                        title={file.name}
                      >
                        {file.name}
                      </span>
                      <span className="text-xs text-neutral-500 ml-2 whitespace-nowrap">
                        {Math.round(file.size / 1024)} KB
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {attachmentsError && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {attachmentsError}
                </div>
              )}
              {uploadDocs.error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  Failed to upload attachments. Please try again after creating
                  the complaint.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-4">
          <Button type="button" variant="secondary" onClick={() => nav(-1)}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={create.isPending || uploadDocs.isPending}
            className="bg-[rgb(var(--color-gov-blue))] hover:bg-blue-900 text-white min-w-[140px]"
          >
            {create.isPending || uploadDocs.isPending
              ? "Processing..."
              : "Submit Complaint"}
          </Button>
        </div>
      </div>

      {create.error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 p-4 rounded-lg shadow-lg max-w-sm animate-in fade-in slide-in-from-bottom-4">
          <h4 className="text-red-800 font-semibold text-sm mb-1">
            Error Submitting
          </h4>
          <p className="text-red-600 text-xs">
            {(create.error as any).message}
          </p>
        </div>
      )}
    </form>
  );
}
