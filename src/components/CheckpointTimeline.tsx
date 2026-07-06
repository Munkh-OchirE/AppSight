import type { SummaryCheckpoint } from "@/lib/llm/checkpoints";

function statusTone(status: SummaryCheckpoint["status"]) {
  if (status === "success") {
    return "border-green-200 bg-green-50 text-success";
  }

  if (status === "failed") {
    return "border-red-200 bg-red-50 text-danger";
  }

  if (status === "skipped") {
    return "border-slate-200 bg-panel text-slate-500";
  }

  return "border-blue-200 bg-blue-50 text-accent";
}

export function CheckpointTimeline({
  checkpoints
}: {
  checkpoints: SummaryCheckpoint[];
}) {
  if (checkpoints.length === 0) {
    return <p className="text-sm text-slate-500">No checkpoints recorded yet.</p>;
  }

  return (
    <ol className="grid gap-2">
      {checkpoints.map((checkpoint) => (
        <li key={checkpoint.name} className="rounded-md border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">
              {checkpoint.name.replaceAll("_", " ")}
            </p>
            <span
              className={`rounded-sm border px-2 py-1 text-xs font-medium ${statusTone(
                checkpoint.status
              )}`}
            >
              {checkpoint.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-700">{checkpoint.message}</p>
          <p className="mt-1 text-xs text-slate-500">
            {new Date(checkpoint.timestamp).toLocaleString()}
          </p>
          {checkpoint.details ? (
            <dl className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
              {Object.entries(checkpoint.details).map(([key, value]) => (
                <div key={key}>
                  <dt className="font-medium">{key}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
