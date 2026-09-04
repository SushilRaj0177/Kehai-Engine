"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiFetch } from "@/lib/api";
import type { AttendeeRow } from "@/lib/types";
import { Input } from "./ui/Input";
import { Badge } from "./ui/Badge";
import { LoadingBlock } from "./ui/States";

export function AttendeeTable({ eventId }: { eventId: string }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "attended" | "not_attended">("");

  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (status) qs.set("status", status);

  const { data, isLoading } = useSWR<AttendeeRow[]>(
    `/api/events/${eventId}/attendees${qs.toString() ? `?${qs}` : ""}`,
    (path) => apiFetch(path),
    { refreshInterval: 8000 }
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Input placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="rounded-lg border border-white/10 bg-void-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-shu-500/60"
        >
          <option value="">All</option>
          <option value="attended">Attended</option>
          <option value="not_attended">Not attended</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <p className="py-8 text-center text-sm text-white/35">No registrants match.</p>
      ) : (
        <div className="scroll-thin max-h-96 overflow-auto rounded-lg border border-white/8">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-void-900/95 text-[11px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Checked in</th>
                <th className="px-4 py-2.5 font-medium">Distance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {data.map((row) => (
                <tr key={row.registrationId} className="text-white/75">
                  <td className="px-4 py-2.5 font-medium text-white">{row.user.name}</td>
                  <td className="px-4 py-2.5 text-white/50">{row.user.email}</td>
                  <td className="px-4 py-2.5">
                    {row.attended ? <Badge status="COMPLETED">Attended</Badge> : <Badge>Pending</Badge>}
                  </td>
                  <td className="px-4 py-2.5 text-white/50">
                    {row.checkedInAt ? new Date(row.checkedInAt).toLocaleTimeString() : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-white/50">{row.distanceMeters != null ? `${row.distanceMeters}m` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
