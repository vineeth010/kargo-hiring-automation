"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CandidateDetailJson, QueueRowJson } from "@/lib/apiTypes";
import type { Role } from "cv-scoring-engine";

const HISTORICAL_LABELS: Record<string, string> = {
  ownershipInAmbiguity: "Ownership in ambiguity",
  groundLevelExposure: "Ground-level exposure",
  problemActionOutcome: "Problem→Action→Outcome",
  learningAdaptation: "Learning & adaptation",
  crossFunctionalExecution: "Cross-functional execution",
};

export function Dashboard({
  role,
  reviewQueue,
  screeningQueue,
  thresholds,
}: {
  role: Role;
  reviewQueue: QueueRowJson[];
  screeningQueue: QueueRowJson[];
  thresholds: Record<Role, number>;
}) {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Kargo Hiring Dashboard</h1>
        <RoleTabs role={role} />
      </header>

      <UploadForm role={role} onDone={() => router.refresh()} />
      <ThresholdForm role={role} thresholds={thresholds} onSaved={() => router.refresh()} />

      <section>
        <h2 className="text-lg font-semibold mb-2">
          Review Queue ({reviewQueue.length}) — full review
        </h2>
        <div className="space-y-3">
          {reviewQueue.length === 0 && <p className="text-sm text-neutral-500">Nothing here yet.</p>}
          {reviewQueue.map((row) => (
            <CandidateRow key={row.candidateId} row={row} queue="review_queue" onChanged={() => router.refresh()} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">
          Screening Queue ({screeningQueue.length}) — quick glance
        </h2>
        <div className="space-y-2">
          {screeningQueue.length === 0 && <p className="text-sm text-neutral-500">Nothing here yet.</p>}
          {screeningQueue.map((row) => (
            <CandidateRow key={row.candidateId} row={row} queue="screening_queue" onChanged={() => router.refresh()} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RoleTabs({ role }: { role: Role }) {
  return (
    <nav className="flex gap-2 text-sm">
      {(["PM", "SPM"] as const).map((r) => (
        <a
          key={r}
          href={`/?role=${r}`}
          className={`px-3 py-1 rounded border ${r === role ? "bg-black text-white" : "bg-white"}`}
        >
          {r}
        </a>
      ))}
    </nav>
  );
}

function UploadForm({ role, onDone }: { role: Role; onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [statusLines, setStatusLines] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function upload() {
    setBusy(true);
    const lines: string[] = [];
    for (const file of files) {
      lines.push(`${file.name}: uploading...`);
      setStatusLines([...lines]);
      try {
        const formData = new FormData();
        formData.append("role", role);
        formData.append("file", file);
        const res = await fetch("/api/candidates/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
        lines[lines.length - 1] = `${file.name}: done`;
      } catch (err) {
        lines[lines.length - 1] = `${file.name}: failed — ${err instanceof Error ? err.message : String(err)}`;
      }
      setStatusLines([...lines]);
    }
    setBusy(false);
    setFiles([]);
    onDone();
  }

  return (
    <section className="border rounded p-3">
      <h2 className="font-semibold mb-2">Upload CVs ({role})</h2>
      <input
        type="file"
        multiple
        accept=".pdf,.docx,.txt"
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
      />
      <button
        onClick={upload}
        disabled={busy || files.length === 0}
        className="ml-2 px-3 py-1 border rounded bg-black text-white disabled:opacity-50"
      >
        {busy ? "Processing..." : `Process ${files.length || ""} file(s)`}
      </button>
      {statusLines.length > 0 && (
        <ul className="mt-2 text-sm text-neutral-600">
          {statusLines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ThresholdForm({
  role,
  thresholds,
  onSaved,
}: {
  role: Role;
  thresholds: Record<Role, number>;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(thresholds[role]);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, threshold: value }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <section className="border rounded p-3 flex items-center gap-2 text-sm">
      <label>
        Screening threshold for {role} (out of 100):{" "}
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="border rounded px-2 py-1 w-20"
        />
      </label>
      <button onClick={save} disabled={saving} className="px-2 py-1 border rounded">
        {saving ? "Saving..." : "Save"}
      </button>
      <span className="text-neutral-400">
        Routing only — not a statement about candidate quality.
      </span>
    </section>
  );
}

function CandidateRow({
  row,
  queue,
  onChanged,
}: {
  row: QueueRowJson;
  queue: "review_queue" | "screening_queue";
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<CandidateDetailJson | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  const mostRecent = getMostRecentRole(row.extractedFacts.workHistory);

  async function toggle() {
    if (!open && !detail) {
      setLoading(true);
      const res = await fetch(`/api/candidates/${row.candidateId}`);
      setDetail(await res.json());
      setLoading(false);
    }
    setOpen(!open);
  }

  async function refreshDetail() {
    const res = await fetch(`/api/candidates/${row.candidateId}`);
    setDetail(await res.json());
  }

  async function promote() {
    setBusyAction(true);
    await fetch(`/api/candidates/${row.candidateId}/promote`, { method: "POST" });
    setBusyAction(false);
    onChanged();
  }

  async function draftEmail(emailType: "invite" | "rejection") {
    setBusyAction(true);
    await fetch(`/api/candidates/${row.candidateId}/draft-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailType }),
    });
    setBusyAction(false);
    await refreshDetail();
    if (!open) setOpen(true);
    onChanged();
  }

  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <span className="font-medium">{row.fullName}</span>{" "}
          <span className="text-sm text-neutral-500">
            {mostRecent ? `— ${mostRecent.title} at ${mostRecent.company}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono">
            {row.overallScore ?? "N/A"}/100
          </span>
          <span className="text-neutral-500">{row.extractedFacts.totalYearsPMExperience}y PM exp</span>
          <button onClick={toggle} className="px-2 py-1 border rounded">
            {open ? "Hide details" : "View details"}
          </button>
        </div>
      </div>
      <p className="text-xs text-neutral-500 mt-1">{row.routingReason}</p>

      <div className="flex gap-2 mt-2">
        {queue === "review_queue" && (
          <>
            <button disabled={busyAction} onClick={() => draftEmail("invite")} className="px-2 py-1 border rounded text-sm">
              Interview → draft invite
            </button>
            <button disabled={busyAction} onClick={() => draftEmail("rejection")} className="px-2 py-1 border rounded text-sm">
              Reject → draft rejection
            </button>
          </>
        )}
        {queue === "screening_queue" && (
          <>
            <button disabled={busyAction} onClick={promote} className="px-2 py-1 border rounded text-sm">
              Promote to Review Queue
            </button>
            <button disabled={busyAction} onClick={() => draftEmail("rejection")} className="px-2 py-1 border rounded text-sm">
              Reject → draft rejection
            </button>
          </>
        )}
        <span className="text-xs text-neutral-400 self-center">decision: {row.decision}</span>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t">
          {loading && <p className="text-sm text-neutral-500">Loading...</p>}
          {detail && <CandidateDetail detail={detail} onSent={refreshDetail} />}
        </div>
      )}
    </div>
  );
}

function CandidateDetail({ detail, onSent }: { detail: CandidateDetailJson; onSent: () => void }) {
  const { evaluation, brief, drafts } = detail;
  if (!evaluation) return <p className="text-sm text-neutral-500">No evaluation on record.</p>;
  const latestDraft = drafts[0] ?? null;

  return (
    <div className="space-y-3 text-sm">
      <p>
        Eligibility:{" "}
        <span className={evaluation.eligibilityStatus === "Eligible" ? "text-green-700" : "text-red-700"}>
          {evaluation.eligibilityStatus}
        </span>
        {evaluation.hardRequirementIssues.length > 0 && ` — ${evaluation.hardRequirementIssues.join("; ")}`}
      </p>

      {brief && (
        <p className="bg-amber-50 border border-amber-200 rounded p-2">
          <strong>Brief:</strong> {brief.briefText}
        </p>
      )}

      <div>
        <strong>Historical Kargo-fit: {evaluation.historicalFitTotal}/70</strong>
        <ul className="pl-4 list-disc">
          {Object.entries(evaluation.historicalFit).map(([key, c]) => (
            <li key={key}>
              {HISTORICAL_LABELS[key] ?? key}: {c.score}/{c.maxScore} — {c.reasoning}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <strong>
          JD fit: {evaluation.jdFit.score}/{evaluation.jdFit.maxScore}
        </strong>
        <p>Strong matches: {evaluation.jdFit.strongMatches.join("; ") || "None"}</p>
        <p>Gaps: {evaluation.jdFit.relevantGaps.join("; ") || "None"}</p>
      </div>

      <p>
        <strong>Ranking rationale:</strong> {evaluation.rankingRationale}
      </p>

      <div>
        <strong>Gaps/uncertainty:</strong>
        <ul className="pl-4 list-disc">
          {evaluation.gapsAndUncertainty.map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      </div>

      <div>
        <strong>Interview probes:</strong>
        <ul className="pl-4 list-disc">
          {evaluation.interviewProbes.map((p, i) => (
            <li key={i}>
              {p.probe} <span className="text-neutral-500">({p.rationale})</span>
            </li>
          ))}
        </ul>
      </div>

      {latestDraft && <EmailDraftBox candidateId={detail.candidate.id} draft={latestDraft} onSent={onSent} />}
    </div>
  );
}

function EmailDraftBox({
  candidateId,
  draft,
  onSent,
}: {
  candidateId: string;
  draft: CandidateDetailJson["drafts"][number];
  onSent: () => void;
}) {
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.bodyTemplate);
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    const res = await fetch(`/api/candidates/${candidateId}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId: draft.id, editedSubject: subject, editedBody: body }),
    });
    setSending(false);
    if (res.ok) onSent();
    else alert((await res.json()).error);
  }

  return (
    <div className="border rounded p-2 bg-neutral-50">
      <p className="font-medium">
        {draft.emailType === "invite" ? "Interview invite draft" : "Rejection draft"} — status: {draft.status}
      </p>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border rounded px-2 py-1 mt-1" />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        className="w-full border rounded px-2 py-1 mt-1 font-mono text-xs"
      />
      {draft.status !== "sent" ? (
        <button onClick={send} disabled={sending} className="mt-1 px-3 py-1 border rounded bg-black text-white">
          {sending ? "Sending..." : "Confirm & Send"}
        </button>
      ) : (
        <p className="text-green-700 text-xs mt-1">Sent {draft.sentAt}</p>
      )}
    </div>
  );
}

function getMostRecentRole(workHistory: { title: string; company: string; endDate: string }[]) {
  if (!workHistory?.length) return null;
  const key = (d: string) => (d.trim().toLowerCase() === "present" ? "9999-99" : d);
  const sorted = [...workHistory].sort((a, b) => (key(b.endDate) > key(a.endDate) ? 1 : -1));
  return sorted[0];
}
