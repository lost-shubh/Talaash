'use client';
import { useState, useEffect } from 'react';
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


/* -------------------- FORM FIELD COMPONENT (FIXED) -------------------- */

function FG({ label, name, req, hint, type = 'text', rows, opts, f, set, errors }: any) {
  return (
    <div className="fg">
      <label className="flabel" htmlFor={`fi_${name}`}>
        {label}{req && <span className="req"> *</span>}
      </label>

      {type === 'textarea' ? (
        <textarea
          id={`fi_${name}`}
          className="ftextarea"
          rows={rows || 4}
          value={f[name] || ''}
          onChange={e => set(name, e.target.value)}
        />
      ) : type === 'select' ? (
        <select
          id={`fi_${name}`}
          className="fselect"
          value={f[name] || ''}
          onChange={e => set(name, e.target.value)}
        >
          {opts}
        </select>
      ) : (
        <input
          id={`fi_${name}`}
          type={type}
          className="finput"
          value={f[name] || ''}
          onChange={e => set(name, e.target.value)}
        />
      )}

      {hint && <p className="fhint">{hint}</p>}
      {errors[name] && <p className="ferr">{errors[name]}</p>}
    </div>
  );
}


/* -------------------- MAIN PAGE -------------------- */

export default function ReportPage() {

  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<{ id: string; data: string; filename: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [f, setF] = useState<any>({
    name: '',
    age: '',
    gender: 'Female',
    last_seen: '',
    location: '',
    state: 'Delhi',
    description: '',
    physical_desc: '',
    identifying_marks: '',
    age_progression: '',
    report_type: 'adult',
    contact_name: '',
    contact_phone: '',
    contact_relation: '',
    agreeTerms: false,
  });

  /* -------------------- AUTOSAVE DRAFT -------------------- */

  useEffect(() => {
    const saved = localStorage.getItem('reportDraft');
    if (saved) {
      setF(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('reportDraft', JSON.stringify(f));
  }, [f]);

  /* -------------------- STATE UPDATE -------------------- */

  const set = (k: string, v: any) => {
    setF((x: any) => ({ ...x, [k]: v }));
    setErrors((e: any) => ({ ...e, [k]: '' }));
  };

  /* -------------------- VALIDATION -------------------- */

  function validate(s: number) {
    const e: Record<string, string> = {};

    if (s === 0) {
      if (!f.name.trim()) e.name = 'Full name required';
      if (!f.age || isNaN(+f.age)) e.age = 'Valid age required';
      if (!f.last_seen) e.last_seen = 'Date required';
      if (!f.location.trim()) e.location = 'Location required';
      if (!f.description.trim()) e.description = 'Description required';
    }

    if (s === 1) {
      if (!f.physical_desc.trim()) e.physical_desc = 'Physical description required';
    }

    if (s === 2) {
      if (!f.contact_name.trim()) e.contact_name = 'Contact name required';
      if (!f.contact_phone.trim()) e.contact_phone = 'Phone required';
      if (!f.contact_relation.trim()) e.contact_relation = 'Relationship required';
      if (!f.agreeTerms) e.agreeTerms = 'You must confirm declaration';
    }

    return e;
  }

  function next() {
    const e = validate(step);
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setStep((s) => s + 1);
  }

  /* -------------------- PHOTO UPLOAD -------------------- */

  async function addPhotos(ev: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(ev.target.files || []).slice(0, 5 - photos.length);

    for (const fl of files) {

      if (!fl.type.startsWith('image/')) {
        toast('Only image files allowed', 'error');
        continue;
      }

      if (fl.size > 5 * 1024 * 1024) {
        toast('Image too large (max 5MB)', 'error');
        continue;
      }

      const data = await fileToB64(fl);

      setPhotos(ps => [
        ...ps,
        { id: crypto.randomUUID(), data, filename: fl.name }
      ]);
    }

    ev.target.value = '';
  }

  /* -------------------- SUBMIT -------------------- */

  async function submit() {

    const e = validate(2);

    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    if (!user) {
      toast('Login required', 'error');
      router.push('/login');
      return;
    }

    setSubmitting(true);

    try {

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, age: parseInt(f.age), photos }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      localStorage.removeItem('reportDraft');

      toast('Report submitted successfully', 'success');

      router.push('/my-reports');

    } catch (err: any) {

      toast(err.message || 'Submission failed', 'error');
      setSubmitting(false);

    }
  }

  /* -------------------- LOGIN BLOCK -------------------- */

  if (!user) {

    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <h2>Login Required</h2>
        <button onClick={() => router.push('/login')}>
          Login
        </button>
      </div>
    );

  }

  /* -------------------- UI -------------------- */

  return (
    <div className="form-page">

      <h1 className="form-title">FILE A REPORT</h1>

      <div className="steps">
        {STEPS.map((s, i) => (
          <div key={i} className={`step ${i === step ? 'active' : ''}`}>
            {i + 1}. {s}
          </div>
        ))}
      </div>

      {step === 0 && (
        <>
          <FG label="Full Name" name="name" req f={f} set={set} errors={errors} />
          <FG label="Age" name="age" type="number" req f={f} set={set} errors={errors} />
          <FG label="Location" name="location" req f={f} set={set} errors={errors} />
          <FG label="Date Last Seen" name="last_seen" type="date" req f={f} set={set} errors={errors} />
          <FG label="State" name="state" type="select"
            opts={INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
            f={f} set={set} errors={errors}
          />
          <FG label="Description" name="description" type="textarea" rows={5}
            f={f} set={set} errors={errors}
          />
        </>
      )}

      {step === 1 && (
        <>
          <FG label="Physical Description" name="physical_desc" req type="textarea"
            f={f} set={set} errors={errors}
          />

          <input type="file" accept="image/*" multiple onChange={addPhotos} />

          <div className="photo-grid">
            {photos.map(p => (
              <img key={p.id} src={p.data} width={120} alt="Uploaded preview" />
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <FG label="Contact Name" name="contact_name" req f={f} set={set} errors={errors} />
          <FG label="Phone" name="contact_phone" req f={f} set={set} errors={errors} />
          <FG label="Relationship" name="contact_relation" req f={f} set={set} errors={errors} />

          <label>
            <input
              type="checkbox"
              checked={f.agreeTerms}
              onChange={e => set('agreeTerms', e.target.checked)}
            />
            I confirm this information is true
          </label>
        </>
      )}

      <div style={{ marginTop: 40 }}>

        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}>
            Back
          </button>
        )}

        {step < 2 ? (
          <button onClick={next}>
            Continue
          </button>
        ) : (
          <button onClick={submit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        )}

      </div>

    </div>
  );
}
