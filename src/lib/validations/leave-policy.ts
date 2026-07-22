import { z } from "zod";

const leavePolicyContactSchema = z.object({
  phone: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(200),
  address: z.string().trim().min(1).max(300),
});

const leavePolicySectionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(8000),
});

export const leavePolicyDocumentSchema = z.object({
  intro: z.string().trim().min(1).max(2000),
  sections: z.array(leavePolicySectionSchema).min(1).max(20),
  contact: leavePolicyContactSchema,
});
