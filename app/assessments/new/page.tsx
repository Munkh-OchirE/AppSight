"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { procurementStageOptions } from "@/config/questions";

type FormState = {
  applicationName: string;
  vendorName: string;
  applicationUrl: string;
  vendorWebsite: string;
  trustCentreUrl: string;
  description: string;
  businessOwner: string;
  criticality: string;
  procurementStage: string;
  vendorStatus: string;
};

type ApplicationSearchResult = {
  id: string;
  title: string;
  url: string;
  displayUrl: string;
  snippet?: string;
};

type ApplicationDetails = {
  applicationName?: string;
  vendorName?: string;
  applicationUrl?: string;
  vendorWebsite?: string;
  trustCentreUrl?: string;
  description?: string;
  criticality?: string;
};

const initialState: FormState = {
  applicationName: "",
  vendorName: "",
  applicationUrl: "",
  vendorWebsite: "",
  trustCentreUrl: "",
  description: "",
  businessOwner: "",
  criticality: "Medium",
  procurementStage: "Idea",
  vendorStatus: "new"
};

export default function NewAssessmentPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ApplicationSearchResult[]>([]);
  const [selectedApplicationUrl, setSelectedApplicationUrl] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const suppressNextSearch = useRef(false);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));

    if (field === "applicationName") {
      setLookupMessage(null);
      setSearchResults([]);
      setSelectedApplicationUrl("");
    }
  }

  useEffect(() => {
    const applicationName = form.applicationName.trim();

    if (suppressNextSearch.current) {
      suppressNextSearch.current = false;
      return;
    }

    if (applicationName.length < 3) {
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setError(null);
      setLookupMessage(null);
      setIsSearching(true);

      try {
        const response = await fetch("/api/applications/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationName }),
          signal: controller.signal
        });
        const payload = await response.json();

        if (!response.ok) {
          setLookupMessage(payload.error ?? "Unable to search for this application.");
          return;
        }

        const results = (payload.results ?? []) as ApplicationSearchResult[];
        setSearchResults(results);
        setSelectedApplicationUrl("");
        setLookupMessage(
          results.length > 0
            ? "Select the matching application to load its details."
            : "No matching applications were found online."
        );
      } catch (lookupError) {
        if (!(lookupError instanceof DOMException && lookupError.name === "AbortError")) {
          setLookupMessage("Unable to search online. Check the server and try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 700);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.applicationName]);

  async function loadApplicationDetails(selectedUrl = selectedApplicationUrl) {
    const applicationName = form.applicationName.trim();

    if (!applicationName || !selectedUrl) {
      return;
    }

    setError(null);
    setLookupMessage(null);
    setIsLoadingDetails(true);

    try {
      const response = await fetch("/api/applications/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationName,
          selectedUrl
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        setLookupMessage(payload.error ?? "Unable to load application details.");
        return;
      }

      const details = (payload.details ?? {}) as ApplicationDetails;
      const resolvedApplicationName = details.applicationName ?? applicationName;

      if (resolvedApplicationName !== form.applicationName) {
        suppressNextSearch.current = true;
      }

      setForm((current) => ({
        ...current,
        applicationName: resolvedApplicationName,
        vendorName: details.vendorName ?? current.vendorName,
        applicationUrl: details.applicationUrl ?? current.applicationUrl,
        vendorWebsite: details.vendorWebsite ?? current.vendorWebsite,
        trustCentreUrl: details.trustCentreUrl ?? current.trustCentreUrl,
        description: details.description ?? current.description,
        criticality: details.criticality ?? current.criticality,
        procurementStage: "Idea",
        vendorStatus: "new"
      }));
      setLookupMessage("Application details were loaded. Review them before starting the assessment.");
    } catch {
      setLookupMessage("Unable to load application details. Check the server and try again.");
    } finally {
      setIsLoadingDetails(false);
    }
  }

  async function submitAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Unable to create assessment.");
        return;
      }

      router.push(`/assessments/${payload.assessment.id}/draft`);
      router.refresh();
    } catch {
      setError("Unable to create assessment. Check the server and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 border-b border-line pb-6">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Application Risk Snapshot
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">
            Start Application Risk Assessment
          </h1>
        </header>

        <form onSubmit={submitAssessment} className="rounded-md border border-line bg-white p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Application name</span>
                <div className="relative mt-1">
                  <input
                    required
                    type="text"
                    value={form.applicationName}
                    onChange={(event) => updateField("applicationName", event.target.value)}
                    className="h-10 w-full rounded-md border border-line px-3 pr-28 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-blue-100"
                  />
                  {isSearching ? (
                    <span className="absolute inset-y-0 right-3 inline-flex items-center text-xs font-medium text-slate-500">
                      Searching online...
                    </span>
                  ) : null}
                </div>
              </label>

              {searchResults.length > 0 ? (
                <div className="mt-3 rounded-md border border-line bg-slate-50 p-3">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Matching applications
                    </span>
                    <select
                      value={selectedApplicationUrl}
                      onChange={(event) => {
                        const selectedUrl = event.target.value;
                        setSelectedApplicationUrl(selectedUrl);
                        if (selectedUrl) {
                          void loadApplicationDetails(selectedUrl);
                        }
                      }}
                      disabled={isLoadingDetails}
                      className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">
                        {isLoadingDetails ? "Loading application details..." : "Select an application"}
                      </option>
                      {searchResults.map((result) => (
                        <option key={result.id} value={result.url}>
                          {result.title} ({result.displayUrl})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              {lookupMessage ? (
             8ßÏm¢G§²ÚîÆ­yÜsection className={`border px-4 py-3 ${decisionNotice.tone}`} role="status">
            <p className="text-sm font-semibold">{decisionNotice.title}</p>
            <p className="mt-1 text-sm">{decisionNotice.message}</p>
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(([label, value]) => (
            <div key={label} className="rounded-md border border-line bg-white p-4">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <PortfolioPieChart
            title="Application status"
            subtitle="Current assessment workflow distribution"
            emptyText="No status data is available yet."
            total={summary.total}
            data={statusData}
          />
          <PortfolioPieChart
            title="Application risk level"
            subtitle="Current assessed risk distribution"
            emptyText="No risk data is available yet."
            total={summary.total}
            data={riskData}
          />
        </div>

        <section className="overflow-hidden rounded-md border border-line bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold">Assessment overview</h2>
              <p className="mt-1 text-sm text-slate-500">
                Sorted by most recently updated
              </p>
            </div>
            <p className="text-sm font-medium text-slate-600">
              {assessments.length} total
            </p>
          </div>
          {assessments.length === 0 ? (
            <div className="px-4 py-10 text-center text-slate-500">
              No assessments yet. Start one from the new assessment page.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line text-sm">
                <thead className="bg-panel text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Application</th>
                    <th className="px-4 py-3 font-medium">Vendor</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Risk</th>
                    <th className="px-4 py-3 font-medium">Criticality</th>
                    <th className="px-4 py-3 font-medium">Procurement stage</th>
                    <th className="px-4 py-3 font-medium">Business owner</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {assessments.map((assessment) => (
                    <tr key={assessment.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-ink">
                        <Link
                          href={`/assessments/${assessment.id}/draft`}
                          className="font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                        >
                          {assessment.applicationName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{assessment.vendorName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold ${statusTone(assessment.status)}`}
                        >
                          {statusLabel(assessment.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold ${riskTone(assessment.riskRating)}`}
                        >
                          {assessment.riskRating
                            ? `${assessment.riskRating} (${assessment.riskScore ?? 0})`
                            : "Not scored"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {assessment.criticality ?? "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {assessment.procurementStage ?? "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {assessment.businessOwner ?? "Unassigned"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {assessment.updatedAt.toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeleteAssessmentButton
                          assessmentId={assessment.id}
                          applicationName={assessment.applicationName}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
