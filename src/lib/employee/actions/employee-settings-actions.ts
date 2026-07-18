"use server";

import { z } from "zod";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(/[a-z]/, "Password must include a lowercase letter")
      .regex(/[A-Z]/, "Password must include an uppercase letter")
      .regex(/[0-9]/, "Password must include a number")
      .regex(/[^a-zA-Z0-9]/, "Password must include a special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function employeeChangePasswordAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission([PORTAL_PERMISSIONS.employee]);
    const parsed = changePasswordSchema.parse(input);
    const supabase = await createClient();

    // Verify the current password before allowing the change.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: parsed.currentPassword,
    });
    if (verifyError) {
      return { success: false as const, message: "Current password is incorrect" };
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.newPassword });
    if (error) {
      return { success: false as const, message: error.message };
    }

    return { success: true as const, message: "Password updated successfully" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false as const,
        message: error.issues[0]?.message ?? "Please check the form and try again",
      };
    }
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update password",
    };
  }
}
