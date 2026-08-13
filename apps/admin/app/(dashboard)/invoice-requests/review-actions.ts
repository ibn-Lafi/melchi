"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";

export async function approveInvoiceEditRequest(formData: FormData) {
  const requestId = formData.get("requestId");
  if (typeof requestId !== "string") return;

  const supabase = createSupabaseServerClient();
  await supabase.rpc("review_invoice_edit_request", {
    p_request_id: requestId,
    p_decision: "approved",
    p_admin_notes: null,
  });

  revalidatePath("/invoice-requests");
  revalidatePath("/invoices");
}

export async function rejectInvoiceEditRequest(formData: FormData) {
  const requestId = formData.get("requestId");
  if (typeof requestId !== "string") return;

  const supabase = createSupabaseServerClient();
  await supabase.rpc("review_invoice_edit_request", {
    p_request_id: requestId,
    p_decision: "rejected",
    p_admin_notes: null,
  });

  revalidatePath("/invoice-requests");
}
