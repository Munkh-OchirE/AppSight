"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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

const initialState: FormState = {
  applicationName: "",
  vendorName: "",
  applicationUrl: "",
  vendorWebsite: "",
  trustCentreUrl: "",
  description: "",
  businessOwner: "",
  criticality: "",
  procurementStage: "",
  vendorStatus: ""
};

export default function NewAssessmentPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
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
            <Field
              label="Application name"
              value={form.applicationName}
              required
              onChange={(value) => updateField("applicationName", value)}
            />
            <Field
              label="Vendor name"
              value={form.vendorName}
              required
              onChange={(value) => updateField("vendorName", value)}
            />
            <Field
              label="Application/product URL"
              value={form.applicationUrl}
              type="url"
              onChange={(value) => updateField("applicationUrl", value)}
            />
            <Field
              label="Vendor website"
              value={form.vendorWebsite}
              type="url"
              onChange={(value) => updateField("vendorWebsite", value)}
            />
            <Field
              label="Trust centre/security page URL"
              value={form.trustCentreUrl}
              type="url"
              onChange={(value) => updateField("trustCentreUrl", value)}
            />
            <Field
              label="Business owner"
              value={form.businessOwner}
              onChange={(value) => updateField("businessOwner", value)}
            />
            <SelectField
              label="Criticality to business"
              value={form.criticality}
              options={["", "Low", "Medium", "High", "Critical"]}
              onChange={(value) => updateField("criticality", value)}
            />
            <Field
              label="Procurement stage"
              value={form.procurementStage}
              onChange={(value) => updateField("procurementStage", value)}
            />
            <SelectField
              label="Vendor status"
              value={form.vendorStatus}
              options={["", "new", "existing"]}
              onChange={(value) => updateField("vendorStatus", value)}
            />
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">
              Short description of intended use
            </span>
            <textarea
              required
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              rows={6}
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-blue-100"
              placeholder="We want to use a SaaS finance platform for invoice approvals. Users will log in with Entra ID SSO. It will integrate with our finance system using API and process supplier and invoice data."
            />
          </label>

          {error ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Start assessment"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option || "unknown"} value={option}>
            {option || "Unknown"}
          </option>
        ))}
      </select>
    </label>
  );
}
