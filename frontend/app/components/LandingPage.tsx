import Link from 'next/link';

export function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Your resume, tailored to every job you apply to
              </h1>
              <p className="mt-4 text-lg text-slate-600 max-w-xl">
                Stand out when it matters. Optimal CV adapts your experience and skills to each role so your application gets noticed by hiring teams and passes modern screening.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-6 py-3 text-base font-medium text-white hover:bg-slate-900 transition-colors"
                >
                  Get started free
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </div>
            <div className="relative flex justify-center lg:justify-end">
              <HeroIllustration />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16 sm:py-20" aria-labelledby="how-it-works-heading">
        <div className="mx-auto max-w-6xl px-6">
          <h2 id="how-it-works-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl text-center">
            How it works
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            One profile. Add any job. Get a tailored CV and cover letter in minutes.
          </p>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            <StepCard
              step={1}
              title="Upload your CV or build your profile"
              description="Start with your existing resume or enter your experience. We parse your content so you do not have to retype everything."
              icon={<StepOneIcon />}
            />
            <StepCard
              step={2}
              title="Add the job description"
              description="Paste the job description or paste a link to the listing. We use it to tailor your CV and motivation letter to that specific role."
              icon={<StepTwoIcon />}
            />
            <StepCard
              step={3}
              title="Download your tailored CV and letter"
              description="Get a professional PDF CV and cover letter optimized for that job. Use the same profile for every application."
              icon={<StepThreeIcon />}
            />
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/register"
              className="inline-flex items-center rounded-lg bg-slate-800 px-6 py-3 text-base font-medium text-white hover:bg-slate-900 transition-colors"
            >
              Create your first tailored CV
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20 border-y border-slate-200" aria-labelledby="why-tailor-heading">
        <div className="mx-auto max-w-6xl px-6">
          <h2 id="why-tailor-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl text-center">
            One profile, countless applications
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Generic resumes get overlooked. Job-specific CVs get shortlisted. We help you speak the language of each role.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureBlock
              title="Built for modern hiring"
              description="Your CV is optimized to align with how employers and screening tools evaluate candidates today."
              icon={<TargetIcon />}
            />
            <FeatureBlock
              title="Match the job description"
              description="Keywords and phrasing from the role are reflected in your CV and cover letter so you stand out."
              icon={<MatchIcon />}
            />
            <FeatureBlock
              title="Professional PDFs"
              description="Download clean, ATS-friendly CV and cover letter PDFs ready to upload to any job board."
              icon={<PdfIcon />}
            />
            <FeatureBlock
              title="Cover letters included"
              description="Get a tailored motivation letter for each application so your whole package is consistent."
              icon={<LetterIcon />}
            />
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16 sm:py-20" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl px-6">
          <h2 id="faq-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl text-center">
            Frequently asked questions
          </h2>
          <ul className="mt-10 space-y-8">
            <li>
              <h3 className="text-lg font-semibold text-slate-900">How is Optimal CV different from a regular resume builder?</h3>
              <p className="mt-2 text-slate-600">
                Most resume builders help you create one static CV. Optimal CV is built for applying to many jobs: you keep one profile and generate a new, tailored CV and cover letter for each role. Your experience is rewritten and emphasized to match what each job description asks for, so you stay relevant to both hiring managers and applicant tracking systems.
              </p>
            </li>
            <li>
              <h3 className="text-lg font-semibold text-slate-900">Is it free?</h3>
              <p className="mt-2 text-slate-600">
                You can sign up and use Optimal CV to create job-specific CVs and motivation letters. Create an account to save your profile and access your generation history.
              </p>
            </li>
            <li>
              <h3 className="text-lg font-semibold text-slate-900">Is my data safe?</h3>
              <p className="mt-2 text-slate-600">
                We use your profile and job descriptions only to generate your tailored CV and cover letter. We do not sell your data. You can delete your account and all associated data at any time from your profile settings.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section className="bg-slate-800 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to get shortlisted?
          </h2>
          <p className="mt-3 text-slate-300 max-w-xl mx-auto">
            Join job seekers who tailor their application to every role. One profile, professional CVs and letters for each job.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-medium text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-slate-500 text-white px-6 py-3 text-base font-medium hover:bg-slate-700 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold text-slate-800 hover:text-slate-900">
            Optimal CV
          </Link>
          <nav className="flex items-center gap-6 text-sm text-slate-600">
            <Link href="/login" className="hover:text-slate-900">Sign in</Link>
            <Link href="/register" className="hover:text-slate-900">Sign up</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}

function StepCard({
  step,
  title,
  description,
  icon,
}: { step: number; title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm font-medium text-white">
        {step}
      </span>
      <div className="mt-4 flex justify-center text-slate-400">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-slate-600">{description}</p>
    </div>
  );
}

function FeatureBlock({
  title,
  description,
  icon,
}: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex justify-center text-slate-500">{icon}</div>
      <h3 className="mt-3 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}

function HeroIllustration() {
  return (
    <svg className="w-full max-w-md h-auto text-slate-200" viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="80" y="40" width="240" height="200" rx="8" stroke="currentColor" strokeWidth="1.5" fill="white" />
      <rect x="100" y="60" width="80" height="12" rx="2" fill="currentColor" opacity="0.2" />
      <rect x="100" y="80" width="200" height="8" rx="1" fill="currentColor" opacity="0.1" />
      <rect x="100" y="96" width="180" height="8" rx="1" fill="currentColor" opacity="0.1" />
      <rect x="100" y="112" width="160" height="8" rx="1" fill="currentColor" opacity="0.1" />
      <rect x="100" y="140" width="80" height="12" rx="2" fill="currentColor" opacity="0.2" />
      <rect x="100" y="160" width="200" height="8" rx="1" fill="currentColor" opacity="0.1" />
      <rect x="100" y="176" width="180" height="8" rx="1" fill="currentColor" opacity="0.1" />
      <circle cx="320" cy="100" r="40" stroke="currentColor" strokeWidth="1.5" fill="white" opacity="0.8" />
      <path d="M300 100 L320 120 L340 95" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function StepOneIcon() {
  return (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function StepTwoIcon() {
  return (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function StepThreeIcon() {
  return (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function MatchIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function LetterIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
