import { redirect } from "next/navigation";
import { Card, Input } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { AppNav } from "../../components/nav";
import { ActionForm } from "../../components/action-form";
import { updateOwnNameAction, updateOwnPasswordAction } from "./actions";

type Profile = { name: string; email: string | null };

export default async function AccountPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select<"name, email", Profile>("name, email")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <div>
      <AppNav />
      <main className="mx-auto max-w-xl space-y-4 p-4 pb-28">
        <h1 className="mb-1 text-xl font-bold">حسابي</h1>

        <Card>
          <p className="text-sm">
            <span className="text-foreground/60">البريد الإلكتروني: </span>
            <span dir="ltr">{profile.email}</span>
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">تعديل الاسم</h2>
          <ActionForm action={updateOwnNameAction} submitLabel="حفظ الاسم">
            <Input name="name" defaultValue={profile.name} required />
          </ActionForm>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">تغيير كلمة المرور</h2>
          <ActionForm action={updateOwnPasswordAction} submitLabel="تحديث كلمة المرور">
            <Input name="password" type="password" minLength={6} placeholder="كلمة مرور جديدة" required />
          </ActionForm>
        </Card>
      </main>
    </div>
  );
}
