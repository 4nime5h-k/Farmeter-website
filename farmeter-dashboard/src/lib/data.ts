import { supabase } from "./supabase";

export type AppRole = "admin" | "ops";
export type PickupSource = "fm_pickups" | "pickups";

export type Pickup = {
  id: string;
  source: PickupSource;
  waste_type: string;
  pickup_address: string;
  estimated_weight: number;
  actual_weight: number | null;
  status: string;
  created_at: string;
  supplier_name: string;
  collector_name: string | null;
  notes?: string | null;
};

export type Collector = {
  id: string;
  display_name: string;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  status_label: string;
};

export type Supplier = {
  id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  is_active: boolean | null;
};

function profileText(row: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function profileFlag(row: Record<string, unknown>, ...keys: string[]): boolean | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") return value;
  }
  return null;
}

function uniqueProfiles<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function isMissingTable(error: { code?: string }) {
  return error.code === "42P01" || error.code === "PGRST205";
}

export async function getRole(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.role === "admin" || data?.role === "ops" ? data.role : null;
}

export async function getPickups(): Promise<Pickup[]> {
  const [modern, legacy] = await Promise.all([
    supabase.from("fm_pickups").select(
      "id,waste_type,pickup_address,estimated_weight,actual_weight,weight_unit,status,created_at,supplier_id,collector_id,notes"
    ).order("created_at", { ascending: false }),
    supabase.from("pickups").select(
      "id,waste_type,pickup_address,estimated_weight,actual_weight,status,created_at,supplier_name,collector_name"
    ).order("created_at", { ascending: false }),
  ]);

  if (modern.error) throw modern.error;
  if (legacy.error) throw legacy.error;

  const modernRows: Pickup[] = (modern.data ?? []).map((r: any) => ({
    id: r.id,
    source: "fm_pickups",
    waste_type: r.waste_type,
    pickup_address: r.pickup_address,
    estimated_weight: Number(r.estimated_weight ?? 0),
    actual_weight: r.actual_weight == null ? null : Number(r.actual_weight),
    status: r.status,
    created_at: r.created_at,
    supplier_name: r.supplier_id ? `Supplier ${String(r.supplier_id).slice(0, 6)}` : "—",
    collector_name: r.collector_id ? `Collector ${String(r.collector_id).slice(0, 6)}` : null,
    notes: r.notes,
  }));

  const legacyRows: Pickup[] = (legacy.data ?? []).map((r: any) => ({
    id: r.id,
    source: "pickups",
    waste_type: r.waste_type,
    pickup_address: r.pickup_address,
    estimated_weight: Number(r.estimated_weight ?? 0),
    actual_weight: r.actual_weight == null ? null : Number(r.actual_weight),
    status: r.status,
    created_at: r.created_at,
    supplier_name: r.supplier_name ?? "—",
    collector_name: r.collector_name ?? null,
  }));

  return [...modernRows, ...legacyRows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getCollectors(): Promise<Collector[]> {
  const tableNames = ["fm_collector_profiles", "collector_profiles", "fm_collectors", "collectors"];
  const results = await Promise.all(tableNames.map((table) => supabase.from(table).select("*")));
  const errors = results.flatMap((result) => result.error ? [result.error] : []);
  const availableTables = results.filter((result) => !result.error).length;
  const blockingError = errors.find((error) => !isMissingTable(error));
  if (blockingError) throw blockingError;
  if (availableTables === 0) {
    throw new Error("Collector profiles are not available: no supported collector table was found in Supabase.");
  }

  const rows = results.flatMap((result) => result.data ?? []) as Record<string, unknown>[];
  return uniqueProfiles(rows.flatMap((row) => {
    const id = profileText(row, "id", "user_id", "collector_id");
    if (!id) return [];
    const online = profileFlag(row, "is_online", "is_available");
    const active = profileFlag(row, "is_active");
    const rawStatus = profileText(row, "status", "availability_status");
    const status = rawStatus?.toLowerCase();
    return [{
      id,
      display_name: profileText(row, "display_name", "full_name", "name", "business_name") ?? "Unnamed collector",
      phone: profileText(row, "phone", "phone_number"),
      email: profileText(row, "email", "contact_email"),
      location: profileText(row, "address", "location", "city"),
      status_label: online !== null ? (online ? "Online" : "Offline")
        : active !== null ? (active ? "Active" : "Inactive")
        : rawStatus ?? (["online", "active", "available"].includes(status ?? "") ? "Active" : "Registered"),
    }];
  }));
}

export async function getSuppliers(): Promise<Supplier[]> {
  const [modern, legacy] = await Promise.all([
    supabase.from("fm_supplier_profiles").select("*"),
    supabase.from("supplier_profiles").select("*"),
  ]);
  const results = [modern, legacy];
  const errors = results.flatMap((result) => result.error ? [result.error] : []);
  const availableTables = results.filter((result) => !result.error).length;
  const blockingError = errors.find((error) => !isMissingTable(error));
  if (blockingError) throw blockingError;
  if (availableTables === 0) {
    throw new Error("Supplier profiles are not available: neither fm_supplier_profiles nor supplier_profiles exists in Supabase.");
  }

  const rows = [...(modern.data ?? []), ...(legacy.data ?? [])] as Record<string, unknown>[];
  return uniqueProfiles(rows.map((row) => ({
    id: String(row.id),
    display_name: profileText(row, "display_name", "business_name", "company_name", "full_name", "name") ?? "Unnamed supplier",
    phone: profileText(row, "phone", "phone_number"),
    email: profileText(row, "email", "contact_email"),
    location: profileText(row, "address", "location", "city"),
    is_active: profileFlag(row, "is_active", "is_verified"),
  })));
}

export async function createPickup(input: {
  userId: string;
  wasteType: string;
  address: string;
  estimatedWeight: number;
  notes: string;
}) {
  const { error } = await supabase.from("fm_pickups").insert({
    supplier_id: input.userId,
    waste_type: input.wasteType,
    pickup_address: input.address,
    estimated_weight: input.estimatedWeight,
    weight_unit: "kg",
    notes: input.notes || null,
    status: "pending",
  });
  if (error) throw error;
}

export async function updatePickup(pickup: Pickup, status: string, actualWeight?: number | null) {
  const table = pickup.source;
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (actualWeight !== undefined) {
    if (table === "fm_pickups") patch.actual_weight = actualWeight;
    else patch.actual_weight = actualWeight;
  }
  const { error } = await supabase.from(table).update(patch).eq("id", pickup.id);
  if (error) throw error;
}