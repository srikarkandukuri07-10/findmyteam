import "server-only";
import { requireUser } from "@/lib/auth/dal";

export type CollegePeer = {
  id: string;
  name: string;
  avatarPath: string | null;
  branch: string | null;
  year: number;
};

/** D32: students from my college I could connect with (not already connected, asked or blocked). */
export async function getCollegePeers(limit = 4): Promise<CollegePeer[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("list_college_peers", { p_limit: limit });
  if (error) throw error;
  return data.map((p) => ({
    id: p.id,
    name: p.display_name,
    avatarPath: p.avatar_path,
    branch: p.branch_name,
    year: p.year_of_study,
  }));
}
