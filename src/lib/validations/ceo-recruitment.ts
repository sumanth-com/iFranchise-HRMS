import { z } from "zod";

import { paginationSchema } from "@/lib/validations/common";

export const ceoRecruitmentListParamsSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  candidateId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  jobOpeningId: z.string().uuid().optional(),
  recruiterId: z.string().uuid().optional(),
  stage: z
    .enum(["applied", "screening", "technical", "hr", "ceo", "offer", "joined", "rejected"])
    .optional(),
  employmentTypeId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const ceoRecruitmentCandidateIdSchema = z.object({
  candidateId: z.string().uuid(),
});
