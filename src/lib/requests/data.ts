import "server-only";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";

const roleSchema = z.object({ id: z.number(), name: z.string() });

export type RequestDirection = "received" | "sent";
export type RequestStatus = "pending" | "accepted" | "rejected" | "cancelled" | "expired";

export type RequestItem = {
  id: string;
  otherId: string;
  name: string;
  college: string | null;
  branch: string | null;
  year: number;
  roles: z.infer<typeof roleSchema>[];
  isDemo: boolean;
  status: RequestStatus;
  createdAt: string;
};

/** CONN-1: requests the signed-in student received or sent, newest first. */
export async function listRequests(direction: RequestDirection): Promise<RequestItem[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("list_requests", { p_direction: direction });
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    otherId: r.other_id,
    name: r.other_name,
    college: r.other_college,
    branch: r.other_branch,
    year: r.other_year,
    roles: z.array(roleSchema).catch([]).parse(r.other_roles),
    isDemo: r.other_is_demo,
    status: r.status,
    createdAt: r.created_at,
  }));
}
