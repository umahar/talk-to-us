"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgePoundSterling,
  Check,
  FileText,
  Lightbulb,
  LockKeyhole,
  Paperclip,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { usePortal } from "@/components/portal-provider";
import { Alert, PageHeader } from "@/components/ui";
import { FILE_COUNT_LIMIT, getFileError } from "@/lib/domain";

export function IdeaForm() {
  const { categories, createIdea, demo } = usePortal();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(() => categories.find((category) => category.is_active)?.id ?? "");
  const [hasBudget, setHasBudget] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState("");
  const [currency, setCurrency] = useState(process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "GBP");
  const [budgetPeriod, setBudgetPeriod] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  function addFiles(incoming: File[]) {
    setFileError("");
    const combined = [...files];
    for (const file of incoming) {
      if (combined.some((candidate) => candidate.name === file.name && candidate.size === file.size)) continue;
      const fileIssue = getFileError(file);
      if (fileIssue) {
        setFileError(fileIssue);
        return;
      }
      if (combined.length >= FILE_COUNT_LIMIT) {
        setFileError(`Choose up to ${FILE_COUNT_LIMIT} files.`);
        return;
      }
      combined.push(file);
    }
    setFiles(combined);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!categoryId) throw new Error("Choose a category before submitting.");
      const id = await createIdea({
        title,
        description,
        categoryId,
        estimatedCost: hasBudget && estimatedCost.trim() ? Number(estimatedCost) : null,
        costCurrency: currency,
        budgetPeriod: hasBudget && budgetPeriod.trim() ? budgetPeriod.trim() : null,
      }, files);
      router.push(`/ideas/${id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your idea could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Your voice belongs here"
        title="Share an idea"
        subtitle="A little context helps your idea find the right people and its next step."
        action={<Link className="button button-secondary" href="/ideas"><ArrowLeft size={13} /> Back to ideas</Link>}
      />
      <form className="form-layout" onSubmit={handleSubmit}>
        <div className="panel form-card">
          {error && <Alert>{error}</Alert>}
          <section className="form-section" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
            <div className="form-section-head">
              <span className="section-number">01</span>
              <div><h2>The idea</h2><p>Start with the change you would like to see.</p></div>
            </div>
            <label className="field">
              <span className="field-label">Give your idea a name</span>
              <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Make meeting rooms easier to book" required minLength={8} maxLength={120} />
              <span className="field-hint">A clear title helps people find it later. {title.length}/120</span>
            </label>
            <label className="field">
              <span className="field-label">Tell us a little more</span>
              <textarea className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What could work better? Who would it help? What might a first step look like?" required minLength={30} maxLength={5000} />
              <span className="field-hint">A few sentences is plenty. {description.length}/5,000</span>
            </label>
            <label className="field" style={{ maxWidth: 340 }}>
              <span className="field-label">Choose a category</span>
              <select className="select-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
                <option value="" disabled>Select a category</option>
                {categories.filter((category) => category.is_active).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <span className="section-number">02</span>
              <div><h2>Useful details</h2><p>Help the review team understand what it might take.</p></div>
            </div>
            <label className="budget-toggle">
              <span className="budget-toggle-icon"><BadgePoundSterling size={17} /></span>
              <span className="budget-toggle-copy"><strong>Does this idea need a budget?</strong><span>You can leave this blank if it does not need funding.</span></span>
              <input type="checkbox" checked={hasBudget} onChange={(event) => setHasBudget(event.target.checked)} />
              <span className="toggle-track" aria-hidden="true"><span /></span>
            </label>
            {hasBudget && (
              <div className="field-row" style={{ marginTop: 13 }}>
                <label className="field">
                  <span className="field-label">Estimated cost</span>
                  <span className="currency-input"><span>{currency}</span><input className="input" type="number" min="0" step="0.01" value={estimatedCost} onChange={(event) => setEstimatedCost(event.target.value)} placeholder="0.00" /></span>
                  <span className="field-hint">A rough estimate is fine.</span>
                </label>
                <div className="field-row-inner">
                  <label className="field">
                    <span className="field-label">Currency</span>
                    <select className="select-input" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                      <option value="GBP">GBP · £</option><option value="USD">USD · $</option><option value="EUR">EUR · €</option><option value="CAD">CAD · $</option><option value="AUD">AUD · $</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Budget period</span>
                    <input className="input" value={budgetPeriod} onChange={(event) => setBudgetPeriod(event.target.value)} placeholder="e.g. FY 2026 / 27" maxLength={32} />
                  </label>
                </div>
              </div>
            )}

            <div className="field" style={{ marginTop: 14 }}>
              <span className="field-label">Add an attachment <span style={{ color: "#a49aa3", fontWeight: 500 }}>(optional)</span></span>
              <input
                ref={fileInput}
                className="sr-only"
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg"
                onChange={(event) => {
                  addFiles(Array.from(event.target.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
              <button
                className={`upload-zone${dragging ? " dragging" : ""}`}
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <UploadCloud size={21} />
                <strong>Drop a file here, or browse</strong>
                <span>PDF, DOCX, XLSX, CSV, PNG or JPG · up to 5 files, 10 MB each</span>
              </button>
              {fileError && <span className="field-error" role="alert">{fileError}</span>}
              {files.length > 0 && <div className="upload-list">
                {files.map((file, index) => (
                  <div className="upload-file" key={`${file.name}-${file.lastModified}`}>
                    <FileText size={13} /><span>{file.name}</span><span>{(file.size / 1024 / 1024).toFixed(file.size < 1_000_000 ? 0 : 1)} MB</span>
                    <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>}
              <span className="field-hint">Please avoid sharing personal or confidential information in files.</span>
            </div>
          </section>

          <div className="privacy-note"><LockKeyhole size={14} /><span>Your idea and name are visible to the community. Replies and uploaded files stay private to you and the admin team.</span></div>
          <div className="form-actions">
            <Link className="button button-secondary" href="/ideas">Cancel</Link>
            <button className="button button-primary" type="submit" disabled={busy || !categories.some((category) => category.is_active)}>
              {busy ? <span className="spinner-small" /> : <><Check size={14} /> Submit idea <ArrowRight size={14} /></>}
            </button>
          </div>
        </div>

        <aside className="form-aside">
          <div className="aside-card">
            <span className="aside-icon"><Lightbulb size={17} /></span>
            <h3>A helpful idea has a why</h3>
            <p>Try to describe what is difficult today, who it affects, and what better could look like.</p>
            <div className="aside-tip"><Sparkles size={13} /><span>Keep the first step small and practical.</span></div>
            <div className="aside-tip"><Paperclip size={13} /><span>Add a file only when it makes the idea clearer.</span></div>
          </div>
          <div className="aside-card">
            <h3>What happens next?</h3>
            <p>The admin team will review your idea and keep its status up to date.</p>
            <div className="mini-process">
              <span className="process-dot active" /><span>Submitted</span><i />
              <span className="process-dot" /><span>Reviewed</span><i />
              <span className="process-dot" /><span>Resolved</span>
            </div>
            <p>You’ll get an email when there’s an important update or reply.</p>
          </div>
          {demo && <div className="aside-card aside-demo"><Sparkles size={14} /><span>Demo mode: your idea is saved to this browser so you can try the full flow.</span></div>}
        </aside>
      </form>
    </>
  );
}
