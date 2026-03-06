'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { INDIAN_STATES } from '@/types';

async function fileToB64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error('Read failed'));
    r.readAsDataURL(file);
  });
}

const STEPS = ['Basic Info', 'Physical & Photos', 'Contact & Submit'];

export default function ReportPage() {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<{ id: string; data: string; filename: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [f, setF] = useState({
    name: '', age: '', gender: 'Female', last_seen: '', location: '', state: 'Delhi',
    description: '', physical_desc: '', identifying_marks: '', age_progression: '',
    report_type: 'adult', contact_name: '', contact_phone: '', contact_relation: '', agreeTerms: false,
  });

  const set = (k: string, v: any) => { setF(x => ({ ...x, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  function validate(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!f.name.trim()) e.name = 'Full name is required';
      if (!f.age || isNaN(+f.age) || +f.age < 0 || +f.age > 120) e.age = 'Valid age (0–120) required';
      if (!f.last_seen) e.last_seen = 'Date last seen is required';
      if (new Date(f.last_seen) > new Date()) e.last_seen = 'Date cannot be in the future';
      if (!f.location.trim()) e.location = 'Last known location is required';
      if (!f.description.trim() || f.description.length < 20) e.description = 'At least 20 characters required';
    }
    if (s === 1) {
      if (!f.physical_desc.trim()) e.physical_desc = 'Physical description is required';
    }
    if (s === 2) {
      if (!f.contact_name.trim()) e.contact_name = 'Contact name is required';
      if (!/^[+\d\s\-()\\.]{8,16}$/.test(f.contact_phone)) e.contact_phone = 'Valid phone number required';
      if (!f.contact_relation.trim()) e.contact_relation = 'Relationship is required';
      if (!f.agreeTerms) e.agreeTerms = 'You must confirm this declaration';
    }
    return e;
  }

  function next() {
    const e = validate(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    setStep(s => s + 1);
  }

  async function addPhotos(ev: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(ev.target.files || []).slice(0, 5 - photos.length);
    for (const fl of files) {
      if (!fl.type.startsWith('image/')) { toast('Only image files allowed', 'error'); continue; }
      if (fl.size > 5 * 1024 * 1024) { toast('Image too large — max 5MB', 'error'); continue; }
      const data = await fileToB64(fl);
      setPhotos(ps => [...ps, { id: crypto.randomUUID(), data, filename: fl.name }]);
    }
    ev.target.value = '';
  }

  async function submit() {
    const e = validate(2);
    if (Object.keys(e).length) { setErrors(e); return; }
    if (!user) { toast('Please login to file a report', 'error'); router.push('/login'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, age: parseInt(f.age), photos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      toast(`Report submitted! Case: ${data.caseNumber}. Pending admin review.`, 'success', 6000);
      router.push('/my-reports');
    } catch (err: any) {
      toast(err.message || 'Error submitting report', 'error');
      setSubmitting(false);
    }
  }

  const FG = ({ label, name, req, hint, type = 'text', rows, opts }: any) => (
    <div className="fg">
      <label className="flabel" htmlFor={`fi_${name}`}>{label}{req && <span className="req"> *</span>}</label>
      {type === 'textarea'
        ? <textarea id={`fi_${name}`} className="ftextarea" rows={rows || 4} value={(f as any)[name] || ''} onChange={e => set(name, e.target.value)} />
        : type === 'select'
        ? <select id={`fi_${name}`} className="fselect" value={(f as any)[name] || ''} onChange={e => set(name, e.target.value)}>{opts}</select>
        : <input id={`fi_${name}`} type={type} className="finput" value={(f as any)[name] || ''} onChange={e => set(name, e.target.value)} />
      }
      {hint && <p className="fhint">{hint}</p>}
      {errors[name] && <p className="ferr" role="alert">{errors[name]}</p>}
    </div>
  );

  if (!user) {
    return (
      <div className="form-page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div className="empty-icon">🔒</div>
        <div className="empty-title">Login Required</div>
        <div className="empty-sub">You must be signed in to file a missing person report.</div>
        <button className="btn btn-solid btn-lg" onClick={() => router.push('/login')}>Login or Register</button>
      </div>
    );
  }

  return (
    <div className="form-page">
      <h1 className="form-title">FILE A REPORT</h1>
      <p className="form-subtitle">
        Submit a missing person report. It will be reviewed by an admin before going public.
        All contact details are kept private from unauthenticated users.
      </p>

      <div className="steps" role="tablist">
        {STEPS.map((s, i) => (
          <div key={i} className={`step${i === step ? ' active' : i < step ? ' done' : ''}`} role="tab" aria-selected={i === step}>
            {i + 1}. {s}
          </div>
        ))}
      </div>

      {/* Step 0: Basic Info */}
      {step === 0 && (
        <>
          <div className="fsec-label">01 — Person Details</div>
          <FG label="Full Name" name="name" req />
          <div className="form-row">
            <FG label="Age at Time of Disappearance" name="age" req type="number" />
            <FG label="Gender" name="gender" req type="select" opts={
              ['Male', 'Female', 'Other', 'Prefer not to say'].map(g => <option key={g} value={g}>{g}</option>)
            } />
          </div>
          <div className="form-row">
            <FG label="Date Last Seen" name="last_seen" req type="date" />
            <FG label="Category" name="report_type" type="select" opts={
              [['adult','Adult (18–59)'],['child','Child (under 18)'],['elderly','Elderly (60+)'],['family','Family Member']].map(([v,l]) => <option key={v} value={v}>{l}</option>)
            } />
          </div>
          <FG label="Last Known Location" name="location" req hint="Be specific — landmark, area, street, nearby metro or bus stop" />
          <FG label="State" name="state" req type="select" opts={INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)} />
          <FG label="Circumstances of Disappearance" name="description" req type="textarea" rows={5} hint="What happened, what they were wearing, any unusual circumstances. Min 20 characters." />
        </>
      )}

      {/* Step 1: Physical & Photos */}
      {step === 1 && (
        <>
          <div className="fsec-label">02 — Physical Description</div>
          <FG label="Physical Description" name="physical_desc" req type="textarea" rows={4} hint="Height, weight, complexion, hair colour/length, eye colour, build" />
          <FG label="Identifying Marks" name="identifying_marks" type="textarea" rows={2} hint="Scars, tattoos, birthmarks, piercings, distinctive features" />
          <FG label="Appearance Notes" name="age_progression" hint="Glasses, beard, dyed hair, last known clothing — anything that helps identification" />

          <hr className="fdivider" />
          <div className="fsec-label">Photos</div>
          <div className="alert alert-warn" style={{ marginBottom: 16 }}>
            <span className="alert-icon">📷</span>
            <span>Upload up to 5 clear photos. Photos will be shown in greyscale to protect privacy. Max 5MB each.</span>
          </div>

          {photos.length < 5 && (
            <div className="upload-zone" style={{ position: 'relative', marginBottom: 16 }}>
              <input type="file" accept="image/*" multiple onChange={addPhotos} aria-label="Upload photos" />
              <div className="upload-icon">📷</div>
              <div className="upload-lbl">Click or drag to upload photos</div>
              <div className="upload-sub">JPG, PNG, WEBP — max 5MB each — up to {5 - photos.length} more</div>
            </div>
          )}
          {photos.length > 0 && (
            <div className="photo-grid">
              {photos.map(p => (
                <div key={p.id} className="photo-thumb">
                  <img src={p.data} alt="Uploaded" />
                  <button className="photo-rm" onClick={() => setPhotos(ps => ps.filter(x => x.id !== p.id))} aria-label="Remove photo">✕</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Step 2: Contact & Submit */}
      {step === 2 && (
        <>
          <div className="fsec-label">03 — Contact Information</div>
          <div className="alert alert-warn" style={{ marginBottom: 20 }}>
            <span className="alert-icon">🔒</span>
            <span>Contact details are only shown to registered and logged-in users.</span>
          </div>
          <FG label="Contact Person's Full Name" name="contact_name" req />
          <div className="form-row">
            <FG label="Phone Number" name="contact_phone" req hint="e.g. +91-9876543210" />
            <FG label="Relationship to Missing Person" name="contact_relation" req hint="e.g. Father, Sister, Spouse" />
          </div>
          <hr className="fdivider" />
          <div className="fg">
            <label style={{ display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'flex-start' }}>
              <input type="checkbox" checked={f.agreeTerms} onChange={e => set('agreeTerms', e.target.checked)} style={{ marginTop: 3, flexShrink: 0, width: 16, height: 16 }} />
              <span style={{ fontSize: '.75rem', lineHeight: 1.7 }}>
                I confirm that the information provided is truthful and accurate to the best of my knowledge.
                I understand that filing a false report is a criminal offence.
              </span>
            </label>
            {errors.agreeTerms && <p className="ferr" role="alert">{errors.agreeTerms}</p>}
          </div>
        </>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 24, borderTop: 'var(--border)' }}>
        {step > 0
          ? <button className="btn" onClick={() => setStep(s => s - 1)}>← Back</button>
          : <span />
        }
        {step < 2
          ? <button className="btn btn-solid btn-lg" onClick={next}>Continue →</button>
          : <button className="btn btn-solid btn-lg" onClick={submit} disabled={submitting}>
              {submitting ? <><span className="sp sp-w" /> Submitting…</> : 'Submit Report →'}
            </button>
        }
      </div>
    </div>
  );
}
