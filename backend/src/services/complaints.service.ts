import { randomUUID } from "crypto";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../utils/httpError.js";
import type {
  ComplaintChannel,
  PartyType,
  CreatedBySource,
} from "@prisma/client";
import type { AuthUser } from "../middleware/rbac.js";
import type { UpdateComplaintInput } from "../schemas/complaint.schemas.js";

function generateReferenceNo(now = new Date()) {
  const yyyy = now.getUTCFullYear();
  const rand = Math.floor(Math.random() * 900000 + 100000);
  return `CMP-${yyyy}-${rand}`;
}

export async function createComplaint(input: {
  referenceNo?: string;
  name: string;
  createdBySource: CreatedBySource;
  createdByOtherName?: string;
  complainantType: PartyType;
  contact?: string;
  district: string;
  complainantAddressLine1: string;
  complainantAddressLine2?: string;
  complainantBlock?: string;
  complainantPoliceStation?: string;
  complainantPostOffice?: string;
  complainantCity: string;
  complainantState: string;
  complainantPostalCode: string;
  accusedName: string;
  accusedType: PartyType;
  accusedAddressLine1: string;
  accusedAddressLine2?: string;
  accusedBlock?: string;
  accusedPoliceStation?: string;
  accusedPostOffice?: string;
  accusedDistrict: string;
  accusedCity: string;
  accusedState: string;
  accusedPostalCode: string;
  subject: string;
  description: string;
  channel: ComplaintChannel;
  disabilityTypeId?: string;
  linkedCaseYear?: number;
  linkedCaseId?: string;
  createdIp?: string | null;
  user: AuthUser;
}) {
  // Access policy: keep tight for now (complaints can include sensitive info)
  if (
    !(
      input.user.role === "ADMIN" ||
      input.user.role === "PRIVATE_SECRETARY" ||
      input.user.role === "CITIZEN"
    )
  ) {
    throw new HttpError(403, "Forbidden");
  }

  const channel =
    input.user.role === "CITIZEN" ? "ONLINE_PORTAL" : input.channel;
  const createdBySource =
    input.user.role === "CITIZEN" ? "SELF" : input.createdBySource;
  const createdByOtherName =
    input.user.role === "CITIZEN" ? null : (input.createdByOtherName ?? null);

  const referenceNo = input.referenceNo ?? generateReferenceNo();

  // best-effort collision retry
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.complaint.create({
        data: {
          id: randomUUID(),
          referenceNo,
          name: input.name,
          createdById: input.user.id,
          createdBySource,
          createdByOtherName,
          complainantType: input.complainantType,
          contact: input.contact,
          district: input.district,
          complainantAddressLine1: input.complainantAddressLine1,
          complainantAddressLine2: input.complainantAddressLine2,
          complainantBlock: input.complainantBlock ?? null,
          complainantPoliceStation: input.complainantPoliceStation ?? null,
          complainantPostOffice: input.complainantPostOffice ?? null,
          complainantCity: input.complainantCity,
          complainantState: input.complainantState,
          complainantPostalCode: input.complainantPostalCode,
          accusedName: input.accusedName,
          accusedType: input.accusedType,
          accusedAddressLine1: input.accusedAddressLine1,
          accusedAddressLine2: input.accusedAddressLine2,
          accusedBlock: input.accusedBlock ?? null,
          accusedPoliceStation: input.accusedPoliceStation ?? null,
          accusedPostOffice: input.accusedPostOffice ?? null,
          accusedDistrict: input.accusedDistrict,
          accusedCity: input.accusedCity,
          accusedState: input.accusedState,
          accusedPostalCode: input.accusedPostalCode,
          disabilityTypeId: input.disabilityTypeId ?? null,
          subject: input.subject,
          description: input.description,
          channel,
          createdIp: input.createdIp ?? null,
          linkedCaseYear: input.linkedCaseYear,
          linkedCaseId: input.linkedCaseId,
        },
      });
    } catch (e: any) {
      // unique violation
      if (e?.code === "P2002") {
        if (input.referenceNo)
          throw new HttpError(409, "referenceNo already exists");
        continue;
      }
      throw e;
    }
  }

  throw new HttpError(500, "Failed to generate unique referenceNo");
}

export async function listComplaints(input: {
  q?: string;
  diary?: "missing" | "created" | "all";
  channel?: ComplaintChannel;
  linkedCaseYear?: number;
  linkedCaseId?: string;
  page: number;
  pageSize: number;
  user: AuthUser;
}) {
  if (
    !(
      input.user.role === "ADMIN" ||
      input.user.role === "PRIVATE_SECRETARY" ||
      input.user.role === "CITIZEN"
    )
  ) {
    throw new HttpError(403, "Forbidden");
  }

  const ownerScope =
    input.user.role === "CITIZEN" ? { createdById: input.user.id } : {};

  const where: any = {
    AND: [
      ownerScope,
      input.diary === "missing" ? { linkedCaseId: null } : {},
      input.diary === "created" ? { linkedCaseId: { not: null } } : {},
      input.diary === "all" || !input.diary ? {} : {},
      input.channel ? { channel: input.channel } : {},
      input.linkedCaseYear ? { linkedCaseYear: input.linkedCaseYear } : {},
      input.linkedCaseId ? { linkedCaseId: input.linkedCaseId } : {},
      input.q
        ? {
            OR: [
              { referenceNo: { contains: input.q, mode: "insensitive" } },
              { name: { contains: input.q, mode: "insensitive" } },
              { subject: { contains: input.q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const [total, items] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        disabilityType: true,
      },
    }),
  ]);

  return { items, page: input.page, pageSize: input.pageSize, total };
}

export async function getComplaint(complaintId: string, user: AuthUser) {
  if (
    !(
      user.role === "ADMIN" ||
      user.role === "PRIVATE_SECRETARY" ||
      user.role === "CITIZEN"
    )
  ) {
    throw new HttpError(403, "Forbidden");
  }

  const item = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: {
      linkedCase: true,
      disabilityType: true,
      documents: {
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!item) throw new HttpError(404, "Complaint not found");
  if (user.role === "CITIZEN" && item.createdById !== user.id)
    throw new HttpError(403, "Forbidden");
  return item;
}

export async function diaryEntryFromComplaint(input: {
  complaintId: string;
  caseYear: number;
  registrationNo: string;
  sectionAssigned: "LEGAL" | "OE" | "REGISTRAR" | "STATIONERY" | "COMMISSIONER";
  user: AuthUser;
}) {
  if (
    !(input.user.role === "ADMIN" || input.user.role === "PRIVATE_SECRETARY")
  ) {
    throw new HttpError(403, "Forbidden");
  }

  return await prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.findUnique({
      where: { id: input.complaintId },
    });
    if (!complaint) throw new HttpError(404, "Complaint not found");
    if (complaint.linkedCaseId)
      throw new HttpError(409, "Diary already created for this complaint");

    const existing = await tx.case.findFirst({
      where: { caseYear: input.caseYear, registrationNo: input.registrationNo },
    });
    if (existing)
      throw new HttpError(409, "registrationNo already exists for year");

    const createdCase = await tx.case.create({
      data: {
        caseYear: input.caseYear,
        id: randomUUID(),
        registrationNo: input.registrationNo,
        complainantName: complaint.name,
        subject: complaint.subject,
        sectionAssigned: input.sectionAssigned,
        status: "DIARY_ENTERED",
      },
    });

    await tx.caseStatusHistory.create({
      data: {
        id: randomUUID(),
        caseYear: createdCase.caseYear,
        caseId: createdCase.id,
        oldStatus: "DRAFT",
        newStatus: createdCase.status,
        changedById: input.user.id,
        remarks: `Diary entry created from complaint ${complaint.referenceNo}`,
      },
    });

    const updatedComplaint = await tx.complaint.update({
      where: { id: complaint.id },
      data: {
        linkedCaseYear: createdCase.caseYear,
        linkedCaseId: createdCase.id,
      },
    });

    return { complaint: updatedComplaint, case: createdCase };
  });
}

export async function updateComplaint(
  complaintId: string,
  input: UpdateComplaintInput,
  user: AuthUser,
) {
  if (!(user.role === "ADMIN" || user.role === "PRIVATE_SECRETARY")) {
    throw new HttpError(403, "Forbidden");
  }

  const existing = await prisma.complaint.findUnique({
    where: { id: complaintId },
  });
  if (!existing) throw new HttpError(404, "Complaint not found");

  return prisma.complaint.update({
    where: { id: complaintId },
    data: {
      ...input,
      createdByOtherName: input.createdByOtherName ?? null,
      disabilityTypeId: input.disabilityTypeId ?? null,
      complainantAddressLine2: input.complainantAddressLine2 ?? null,
      complainantBlock: input.complainantBlock ?? null,
      complainantPoliceStation: input.complainantPoliceStation ?? null,
      complainantPostOffice: input.complainantPostOffice ?? null,
      accusedAddressLine2: input.accusedAddressLine2 ?? null,
      accusedBlock: input.accusedBlock ?? null,
      accusedPoliceStation: input.accusedPoliceStation ?? null,
      accusedPostOffice: input.accusedPostOffice ?? null,
    },
  });
}
