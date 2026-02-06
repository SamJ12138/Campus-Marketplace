import { z } from "zod";

// ---- Reusable password rules ----

const passwordRules = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a digit");

// ---- Login ----

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ---- Register ----

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: passwordRules,
    display_name: z
      .string()
      .min(2, "Display name must be at least 2 characters")
      .max(100, "Display name must be at most 100 characters"),
    campus_slug: z
      .string()
      .min(1, "Please select a campus"),
    class_year: z.coerce
      .number()
      .int()
      .min(2020, "Class year must be 2020 or later")
      .max(2035, "Class year must be 2035 or earlier")
      .optional()
      .nullable(),
    phone_number: z
      .string()
      .transform((val) => {
        if (!val) return val;
        // Strip all non-digits
        const digits = val.replace(/\D/g, "");
        // If 10 digits, assume US and add +1
        if (digits.length === 10) {
          return `+1${digits}`;
        }
        // If 11 digits starting with 1, add +
        if (digits.length === 11 && digits.startsWith("1")) {
          return `+${digits}`;
        }
        // Otherwise return as-is (will fail validation if invalid)
        return val.startsWith("+") ? val : `+${digits}`;
      })
      .refine(
        (val) => !val || /^\+[1-9]\d{10,14}$/.test(val),
        "Please enter a valid 10-digit phone number"
      )
      .optional()
      .or(z.literal("")),
    notify_email: z.boolean().default(true),
    notify_sms: z.boolean().default(true),
    accept_terms: z
      .literal(true, {
        errorMap: () => ({ message: "You must accept the terms and conditions" }),
      }),
  })
  .refine(
    (data) => !data.notify_sms || (data.phone_number && data.phone_number !== ""),
    {
      message: "Phone number is required when SMS notifications are enabled",
      path: ["phone_number"],
    },
  );

export type RegisterInput = z.infer<typeof registerSchema>;

// ---- Forgot Password ----

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ---- Reset Password ----

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    new_password: passwordRules,
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ---- Change Password ----

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: passwordRules,
    confirm_new_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_new_password, {
    message: "Passwords do not match",
    path: ["confirm_new_password"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
