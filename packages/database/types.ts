// أنواع TypeScript مطابقة لمخطط قاعدة البيانات (migrations/). يُفضَّل استبدالها
// بالمولَّدة فعليًا من supabase CLI فور ربط مشروع Supabase حقيقي:
//   supabase gen types typescript --project-id <project-id> > packages/database/types.ts
// (يجب أن تتطابق البنية لأنها تعكس نفس migrations هنا). تبسيط مقصود هنا: كل
// "Update" مبني كـ Partial لشكل "Insert" بدل تكرار كل الحقول يدويًا.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          name: string;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          name: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          is_active?: boolean;
        }
      >;
      categories: Table<
        { id: string; name: string; created_at: string; updated_at: string },
        { id?: string; name: string }
      >;
      units: Table<
        { id: string; name: string; created_at: string; updated_at: string },
        { id?: string; name: string }
      >;
      products: Table<
        {
          id: string;
          name: string;
          description: string | null;
          price: number;
          average_cost: number;
          category_id: string | null;
          image_url: string | null;
          visible_in_store: boolean;
          has_expiry: boolean;
          expiry_date: string | null;
          base_unit_id: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          average_cost?: number;
          category_id?: string | null;
          image_url?: string | null;
          visible_in_store?: boolean;
          has_expiry?: boolean;
          expiry_date?: string | null;
          base_unit_id: string;
        }
      >;
      product_units: Table<
        {
          id: string;
          product_id: string;
          unit_id: string;
          conversion_factor_to_base: number;
          unit_price: number | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          product_id: string;
          unit_id: string;
          conversion_factor_to_base: number;
          unit_price?: number | null;
        }
      >;
      suppliers: Table<
        {
          id: string;
          name: string;
          phone: string | null;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        },
        { id?: string; name: string; phone?: string | null; address?: string | null; notes?: string | null }
      >;
      purchase_invoices: Table<
        {
          id: string;
          supplier_id: string;
          invoice_date: string;
          subtotal: number;
          total_amount: number;
          payment_status: Database["public"]["Enums"]["purchase_payment_status"];
          created_by: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          supplier_id: string;
          subtotal?: number;
          total_amount?: number;
          payment_status?: Database["public"]["Enums"]["purchase_payment_status"];
          created_by: string;
        }
      >;
      purchase_invoice_items: Table<
        {
          id: string;
          purchase_invoice_id: string;
          product_id: string;
          unit_id: string;
          quantity_in_unit: number;
          quantity_in_base_unit: number;
          unit_cost: number;
          subtotal: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          purchase_invoice_id: string;
          product_id: string;
          unit_id: string;
          quantity_in_unit: number;
          quantity_in_base_unit: number;
          unit_cost: number;
          subtotal: number;
        }
      >;
      supplier_payments: Table<
        {
          id: string;
          purchase_invoice_id: string | null;
          supplier_id: string;
          amount: number;
          payment_date: string;
          method: Database["public"]["Enums"]["settlement_method"];
          recorded_by: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          purchase_invoice_id?: string | null;
          supplier_id: string;
          amount: number;
          method: Database["public"]["Enums"]["settlement_method"];
          recorded_by: string;
        }
      >;
      warehouse_stock: Table<
        { id: string; product_id: string; quantity_available: number; created_at: string; updated_at: string },
        { id?: string; product_id: string; quantity_available?: number }
      >;
      stock_transfers: Table<
        { id: string; rep_id: string; transfer_date: string; created_by: string; created_at: string; updated_at: string },
        { id?: string; rep_id: string; created_by: string }
      >;
      stock_transfer_items: Table<
        { id: string; transfer_id: string; product_id: string; quantity: number; created_at: string; updated_at: string },
        { id?: string; transfer_id: string; product_id: string; quantity: number }
      >;
      stock_movements: Table<
        {
          id: string;
          movement_type: Database["public"]["Enums"]["stock_movement_type"];
          reference_table: string;
          reference_id: string;
          product_id: string;
          location_type: Database["public"]["Enums"]["stock_location_type"];
          location_id: string | null;
          quantity_change: number;
          balance_after: number;
          performed_by: string | null;
          created_at: string;
        },
        {
          id?: string;
          movement_type: Database["public"]["Enums"]["stock_movement_type"];
          reference_table: string;
          reference_id: string;
          product_id: string;
          location_type: Database["public"]["Enums"]["stock_location_type"];
          location_id?: string | null;
          quantity_change: number;
          balance_after: number;
          performed_by?: string | null;
        }
      >;
      customers: Table<
        {
          id: string;
          name: string;
          shop_name: string | null;
          phone: string | null;
          address: string | null;
          notes: string | null;
          google_maps_link: string | null;
          show_in_store: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          name: string;
          shop_name?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          google_maps_link?: string | null;
          show_in_store?: boolean;
        }
      >;
      customer_reps: Table<
        { id: string; customer_id: string; rep_id: string; created_at: string },
        { id?: string; customer_id: string; rep_id: string }
      >;
      rep_inventory: Table<
        { id: string; rep_id: string; product_id: string; quantity_available: number; created_at: string; updated_at: string },
        { id?: string; rep_id: string; product_id: string; quantity_available?: number }
      >;
      invoices: Table<
        {
          id: string;
          invoice_number: number;
          rep_id: string;
          customer_id: string;
          invoice_date: string;
          subtotal: number;
          vat_amount: number;
          total_amount: number;
          qr_code_data: string;
          payment_method: Database["public"]["Enums"]["invoice_payment_method"];
          status: Database["public"]["Enums"]["invoice_status"];
          created_at: string;
          updated_at: string;
        },
        never // لا INSERT مباشر — عبر create_invoice_with_stock_check() فقط
      >;
      invoice_items: Table<
        {
          id: string;
          invoice_id: string;
          product_id: string;
          unit_id: string;
          quantity_in_unit: number;
          quantity_in_base_unit: number;
          unit_price: number;
          cost_price: number;
          subtotal: number;
          created_at: string;
          updated_at: string;
        },
        never
      >;
      invoice_edit_requests: Table<
        {
          id: string;
          invoice_id: string;
          requested_by: string;
          reason: string;
          requested_changes: Json;
          status: Database["public"]["Enums"]["edit_request_status"];
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        },
        { id?: string; invoice_id: string; requested_by: string; reason: string; requested_changes: Json }
      >;
      credit_notes: Table<
        {
          id: string;
          invoice_id: string;
          amount: number;
          reason: string;
          created_by: string;
          note_date: string;
          created_at: string;
          updated_at: string;
        },
        never // عبر RPC فقط (إلغاء/موافقة تعديل)
      >;
      payments: Table<
        {
          id: string;
          invoice_id: string | null;
          customer_id: string;
          amount: number;
          payment_date: string;
          method: Database["public"]["Enums"]["settlement_method"];
          recorded_by: string;
          created_at: string;
          updated_at: string;
        },
        never // عبر record_customer_payment() فقط
      >;
      return_records: Table<
        {
          id: string;
          invoice_id: string | null;
          customer_id: string;
          rep_id: string | null;
          return_date: string;
          total_credit_amount: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        },
        never // عبر process_return() فقط
      >;
      return_items: Table<
        {
          id: string;
          return_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          condition: Database["public"]["Enums"]["return_condition"];
          created_at: string;
          updated_at: string;
        },
        never
      >;
      system_settings: Table<
        {
          id: number;
          company_name: string;
          vat_registration_number: string;
          commercial_registration_number: string;
          company_address: string;
          invoice_edit_grace_period_minutes: number;
          expiry_alert_days_threshold: number;
          updated_at: string;
          updated_by: string | null;
        },
        never // صف وحيد، عبر seed migration فقط
      >;
      audit_logs: Table<
        {
          id: string;
          table_name: string;
          record_id: string | null;
          action: Database["public"]["Enums"]["audit_action"];
          performed_by: string | null;
          performed_at: string;
          old_values: Json | null;
          new_values: Json | null;
        },
        never // trigger فقط
      >;
    };
    Views: {
      public_store_locations: {
        Row: { id: string; shop_name: string | null; google_maps_link: string | null };
        Relationships: [];
      };
      public_products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          category_id: string | null;
          category_name: string | null;
          base_unit_name: string;
        };
        Relationships: [];
      };
      public_categories: {
        Row: { id: string; name: string };
        Relationships: [];
      };
    };
    Functions: {
      create_invoice_with_stock_check: {
        Args: {
          p_rep_id: string;
          p_customer_id: string;
          p_items: Json;
          p_payment_method: Database["public"]["Enums"]["invoice_payment_method"];
        };
        Returns: string;
      };
      create_purchase_invoice: {
        Args: {
          p_supplier_id: string;
          p_items: Json;
          p_payment_status?: Database["public"]["Enums"]["purchase_payment_status"];
        };
        Returns: string;
      };
      transfer_stock_to_rep: {
        Args: { p_rep_id: string; p_items: Json };
        Returns: string;
      };
      record_customer_payment: {
        Args: {
          p_customer_id: string;
          p_invoice_id: string | null;
          p_amount: number;
          p_method: Database["public"]["Enums"]["settlement_method"];
        };
        Returns: string;
      };
      record_supplier_payment: {
        Args: {
          p_supplier_id: string;
          p_purchase_invoice_id: string | null;
          p_amount: number;
          p_method: Database["public"]["Enums"]["settlement_method"];
        };
        Returns: string;
      };
      process_return: {
        Args: { p_customer_id: string; p_invoice_id: string | null; p_rep_id: string | null; p_items: Json };
        Returns: string;
      };
      cancel_invoice_within_grace_period: {
        Args: { p_invoice_id: string; p_reason: string };
        Returns: string;
      };
      request_invoice_edit: {
        Args: { p_invoice_id: string; p_reason: string; p_requested_changes: Json };
        Returns: string;
      };
      review_invoice_edit_request: {
        Args: {
          p_request_id: string;
          p_decision: Database["public"]["Enums"]["edit_request_status"];
          p_admin_notes?: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: "admin" | "accountant" | "rep";
      invoice_payment_method: "cash" | "credit" | "check" | "transfer";
      settlement_method: "cash" | "check" | "transfer";
      invoice_status: "paid" | "partial" | "unpaid" | "cancelled";
      purchase_payment_status: "paid" | "partial" | "unpaid";
      stock_movement_type:
        | "purchase_in"
        | "transfer_out"
        | "transfer_in"
        | "sale_out"
        | "return_in"
        | "write_off"
        | "adjustment";
      stock_location_type: "warehouse" | "rep";
      return_condition: "resalable" | "damaged" | "expired";
      edit_request_status: "pending" | "approved" | "rejected";
      audit_action: "insert" | "update" | "delete";
    };
  };
};
