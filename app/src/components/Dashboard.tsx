"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { CandidateDetailJson, QueueRowJson } from "@/lib/apiTypes";
import type { Role } from "cv-scoring-engine";

const HISTORICAL_LABELS: Record<string, string> = {
  ownershipInAmbiguity: "Ownership in ambiguity",
  groundLevelExposure: "Ground-level exposure",
  problemActionOutcome: "Problem → Action → Outcome",
  learningAdaptation: "Learning & adaptation",
  crossFunctionalExecution: "Cross-functional execution",
};

const ROLE_TITLES: Record<Role, string> = {
  PM: "Product Manager",
  SPM: "Senior Product Manager",
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
    <div className="min-h-full bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Kargo</p>
            <h1 className="text-2xl font-bold text-slate-900">{ROLE_TITLES[role]} — Hiring Dashboard</h1>
          </div>
          <RoleTabs role={role} />
        </header>

        <UploadForm role={role} onDone={() => router.refresh()} />
        <ThresholdForm role={role} thresholds={thresholds} onSaved={() => router.refresh()} />

        <QueueSection
          title="Review Queue"
          subtitle="full review"
          rows={reviewQueue}
          queue="review_queue"
          onChanged={() => router.refresh()}
        />
        <QueueSection
          title="Screening Queue"
          subtitle="quick glance"
          rows={screeningQueue}
          queue="screening_queue"
          onChanged={() => router.refresh()}
        />
      </div>
    </div>
  );
}

function RoleTabs({ role }: { role: Role }) {
  return (
    <nav className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {(["PM", "SPM"] as const).map((r) => {
        const active = r === role;
        return (
          <a
            key={r}
            href={`/?role=${r}`}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "px-4 py-1.5 rounded-md text-sm font-bold bg-indigo-600 text-white shadow-sm"
                : "px-4 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            }
          >
            {r}
          </a>
        );
      })}
    </nav>
  );
}

function UploadForm({ role, onDone }: { role: Role; onDone: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [statusLines, setStatusLines] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function openPicker() {
    fileInputRef.current?.click();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    setFiles(Array.from(e.dataTransfer.files ?? []));
  }

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
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        onClick={openPicker}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && openPicker()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-300 hover:border-indigo-300 hover:bg-slate-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
        <p className="text-2xl" aria-hidden>
          ⬆️
        </p>
        <p className="mt-2 font-semibold text-slate-700">Upload candidate CVs ({role})</p>
        <p className="text-sm text-slate-500">Click to browse or drag & drop</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">PDF &middot; DOCX &middot; TXT</p>
      </div>

      {files.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-sm text-slate-600">{files.length} file(s) selected</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              upload();
            }}
            disabled={busy}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "Processing…" : `Process ${files.length} file(s)`}
          </button>
        </div>
      )}

      {statusLines.length > 0 && (
        <ul className="mt-3 space-y-0.5 text-sm text-slate-500">
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
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700">Screening threshold — {role}</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Every uploaded candidate is processed and scored (where eligible). This threshold only decides which queue a
        candidate lands in for Arjun&rsquo;s attention — it does not limit how many candidates get processed, and a
        score below it is not a judgment that the candidate is unqualified.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span>Score</span>
        <span className="font-mono font-semibold text-slate-800">≥</span>
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-center font-mono"
        />
        <span>
          → <span className="font-medium text-emerald-700">Review Queue</span>. Below →{" "}
          <span className="font-medium text-amber-700">Screening Queue</span>.
        </span>
        <button
          onClick={save}
          disabled={saving}
          className="ml-auto rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </section>
  );
}

function QueueSection({
  title,
  subtitle,
  rows,
  queue,
  onChanged,
}: {
  title: string;
  subtitle: string;
  rows: QueueRowJson[];
  queue: "review_queue" | "screening_queue";
  onChanged: () => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <span className="text-sm text-slate-400">
          {rows.length} candidate{rows.length === 1 ? "" : "s"} &middot; {subtitle}
        </span>
      </div>
      <div className="space-y-3">
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
            Nothing here yet.
          </p>
        )}
        {rows.map((row) => (
          <CandidateRow key={row.candidateId} row={row} queue={queue} onChanged={onChanged} />
        ))}
      </div>
    </section>
  );
}

function ScoreBadge({ row }: { row: QueueRowJson }) {
  if (row.eligibilityStatus === "Not eligible") {
    return (
      <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-rose-700">
        Ineligible
      </span>
    );
  }
  const positive = row.overallScore !== null && row.overallScore >= 0;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
        positive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {row.overallScore ?? "—"}/100
    </span>
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
  const ineligible = row.eligibilityStatus === "Not eligible";

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

  const decisionStyles: Record<string, string> = {
    pending: "bg-slate-100 text-slate-500",
    interview: "bg-emerald-100 text-emerald-700",
    reject: "bg-rose-100 text-rose-700",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-semibold text-slate-900">{row.fullName}</span>{" "}
          <span className="text-sm text-slate-500">
            {mostRecent ? `— ${mostRecent.title} at ${mostRecent.company}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ScoreBadge row={row} />
          <span className="text-xs text-slate-400">{row.extractedFacts.totalYearsPMExperience}y PM exp</span>
          <button
            onClick={toggle}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            {open ? "Hide details" : "View details"}
          </button>
        </div>
      </div>

      <p className={`mt-1.5 text-xs ${ineligible ? "font-medium text-rose-600" : "text-slate-500"}`}>
        {row.routingReason}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {queue === "review_queue" && (
          <>
            <button
              disabled={busyAction}
              onClick={() => draftEmail("invite")}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              Interview → draft invite
            </button>
            <button
              disabled={busyAction}
              onClick={() => draftEmail("rejection")}
              className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              Reject → draft rejection
            </button>
          </>
        )}
        {queue === "screening_queue" && (
          <>
            <button
              disabled={busyAction}
              onClick={promote}
              className="rounded-md border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
            >
              Promote to Review Queue
            </button>
            <button
              disabled={busyAction}
              onClick={() => draftEmail("rejection")}
              className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              Reject → draft rejection
            </button>
          </>
        )}
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${decisionStyles[row.decision]}`}>
          decision: {row.decision}
        </span>
      </div>

      {open && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {loading && <p className="text-sm text-slate-400">Loading…</p>}
          {detail && <CandidateDetail detail={detail} onSent={refreshDetail} />}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">{children}</h4>;
}

function ScoreTile({
  label,
  value,
  sub,
  tone = "slate",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "slate" | "rose";
}) {
  return (
    <div className={`rounded-lg border p-3 ${tone === "rose" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${tone === "rose" ? "text-rose-700" : "text-slate-800"}`}>{value}</p>
      {sub && <p className="text-xs text-rose-600">{sub}</p>}
    </div>
  );
}

function CandidateDetail({ detail, onSent }: { detail: CandidateDetailJson; onSent: () => void }) {
  const { evaluation, brief, drafts } = detail;
  if (!evaluation) return <p className="text-sm text-slate-400">No evaluation on record.</p>;
  const latestDraft = drafts[0] ?? null;
  const ineligible = evaluation.eligibilityStatus === "Not eligible";

  return (
    <div className="space-y-6">
      {/* Eligibility */}
      <div>
        <SectionLabel>Eligibility</SectionLabel>
        <div
          className={`mt-1.5 rounded-lg border p-3 ${
            ineligible ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <p className={`text-sm font-bold ${ineligible ? "text-rose-700" : "text-emerald-700"}`}>
            {ineligible ? "Ineligible for this role" : "Eligible"}
          </p>
          {ineligible && (
            <p className="mt-0.5 text-sm text-rose-600">{evaluation.hardRequirementIssues.join("; ")}</p>
          )}
        </div>
      </div>

      {/* Interview brief */}
      {brief && (
        <div>
          <SectionLabel>Interview brief</SectionLabel>
          <p className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {brief.briefText}
          </p>
        </div>
      )}

      {/* Score breakdown */}
      <div>
        <SectionLabel>Score breakdown</SectionLabel>
        <div className="mt-1.5 grid grid-cols-3 gap-3">
          <ScoreTile label="Historical Kargo-fit" value={`${evaluation.historicalFitTotal}/70`} />
          <ScoreTile label="JD fit" value={`${evaluation.jdFit.score}/${evaluation.jdFit.maxScore}`} />
          <ScoreTile
            label="Overall"
            value={evaluation.overallScore !== null ? `${evaluation.overallScore}/100` : "Not scored"}
            sub={evaluation.overallScore === null ? "Eligibility gate failed" : undefined}
            tone={evaluation.overallScore === null ? "rose" : "slate"}
          />
        </div>
      </div>

      {/* Historical Kargo-fit evidence */}
      <div>
        <SectionLabel>Historical Kargo-fit evidence</SectionLabel>
        <div className="mt-1.5 space-y-3">
          {Object.entries(evaluation.historicalFit).map(([key, c]) => (
            <div key={key} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">{HISTORICAL_LABELS[key] ?? key}</span>
                <span className="font-mono text-sm font-bold text-slate-600">
                  {c.score}/{c.maxScore}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-400"
                  style={{ width: `${Math.max(0, Math.min(100, (c.score / c.maxScore) * 100))}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-600">{c.reasoning}</p>
              {c.evidence.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-slate-500">
                  {c.evidence.map((e: string, i: number) => (
                    <li key={i}>&ldquo;{e}&rdquo;</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* JD fit */}
      <div>
        <SectionLabel>JD fit</SectionLabel>
        <div className="mt-1.5 space-y-1.5 rounded-lg border border-slate-200 p-3 text-sm">
          <p>
            <span className="font-semibold text-slate-700">Relevant experience: </span>
            <span className="text-slate-600">{evaluation.jdFit.relevantExperience.join("; ") || "None noted"}</span>
          </p>
          <p>
            <span className="font-semibold text-slate-700">Strong matches: </span>
            <span className="text-slate-600">{evaluation.jdFit.strongMatches.join("; ") || "None noted"}</span>
          </p>
          <p>
            <span className="font-semibold text-slate-700">Relevant gaps: </span>
            <span className="text-slate-600">{evaluation.jdFit.relevantGaps.join("; ") || "None noted"}</span>
          </p>
        </div>
      </div>

      {/* Gaps / uncertainties */}
      <div>
        <SectionLabel>Gaps / uncertainties</SectionLabel>
        <ul className="mt-1.5 list-disc space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 pl-7 text-sm text-slate-600">
          {evaluation.gapsAndUncertainty.map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      </div>

      {/* Ranking rationale */}
      <div>
        <SectionLabel>Why ranked here</SectionLabel>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{evaluation.rankingRationale}</p>
      </div>

      {/* Interview probes */}
      <div>
        <SectionLabel>Interview probes</SectionLabel>
        <ul className="mt-1.5 space-y-2">
          {evaluation.interviewProbes.map((p, i) => (
            <li key={i} className="rounded-lg border-l-4 border-indigo-300 bg-slate-50 py-2 pl-3 pr-2">
              <p className="text-sm font-medium text-slate-800">{p.probe}</p>
              <p className="text-xs text-slate-500">{p.rationale}</p>
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
    <div>
      <SectionLabel>{draft.emailType === "invite" ? "Interview invite draft" : "Rejection draft"}</SectionLabel>
      <div className="mt-1.5 rounded-lg border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Status: {draft.status}
          </span>
          {draft.status === "sent" && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              Sent {draft.sentAt}
            </span>
          )}
        </div>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={draft.status === "sent"}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          disabled={draft.status === "sent"}
          className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs disabled:bg-slate-50"
        />
        {draft.status !== "sent" && (
          <button
            onClick={send}
            disabled={sending}
            className="mt-2 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Confirm & Send"}
          </button>
        )}
      </div>
    </div>
  );
}

function getMostRecentRole(workHistory: { title: string; company: string; endDate: string }[]) {
  if (!workHistory?.length) return null;
  const key = (d: string) => (d.trim().toLowerCase() === "present" ? "9999-99" : d);
  const sorted = [...workHistory].sort((a, b) => (key(b.endDate) > key(a.endDate) ? 1 : -1));
  return sorted[0];
}
