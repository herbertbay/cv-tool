import Link from 'next/link';

const MOCK_REVIEWS = [
  {
    quote:
      'I stopped sending the same PDF to every listing. Each application gets a resume and letter that actually match the posting, my reply rate went up.',
    name: 'Alex M.',
    role: 'Product manager',
    accent: 'from-violet-500 to-indigo-600',
  },
  {
    quote:
      'The dashboard is the job application manager I needed. I can see status, links, and which version of my resume I used for each company.',
    name: 'Jordan K.',
    role: 'Software engineer',
    accent: 'from-teal-500 to-emerald-600',
  },
  {
    quote:
      'Feels like a resume optimizer, not a generic template site. The tailored content still sounds like me, just sharper for each role.',
    name: 'Sam R.',
    role: 'Marketing lead',
    accent: 'from-amber-500 to-orange-600',
  },
] as const;

export function LandingPage() {
  return (
    <div className="landing-root">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-indigo-200/60 bg-gradient-to-br from-slate-50 via-indigo-50/90 to-teal-50/40">
        <div
          className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-teal-300/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
                  Resume optimizer
                </span>
                <span className="inline-flex items-center rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
                  Job application manager
                </span>
                <span className="inline-flex items-center rounded-full border border-amber-400/80 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
                  ATS-friendly PDFs
                </span>
              </div>
              <p className="text-sm font-semibold text-indigo-800 mb-2">
                Tired of being ghosted? Get documents that match each role, not one static resume for every job.
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.65rem] lg:leading-tight">
                Optimize your resume and{' '}
                <span className="bg-gradient-to-r from-indigo-700 to-teal-700 bg-clip-text text-transparent">
                  manage every application
                </span>{' '}
                in one place
              </h1>
              <p className="mt-4 text-lg text-slate-600 max-w-xl leading-relaxed">
                Optimal CV tailors your experience and skills to each job description, generates motivation letters, and
                keeps your applications organized on a dashboard, so you stay on top of where you applied and what you
                sent.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/get-started"
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-700 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-700/25 hover:bg-indigo-800 transition-colors"
                >
                  Get started
                </Link>
                <Link
                  href="/cv-checker"
                  className="inline-flex items-center justify-center rounded-xl border-2 border-amber-400/90 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-3.5 text-base font-semibold text-amber-950 hover:from-amber-100 hover:to-orange-100 transition-colors"
                >
                  Free ATS checker
                </Link>
              </div>
            </div>
            <div className="relative flex justify-center lg:justify-end">
              <HeroIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* Mini value strip */}
      <section className="border-b border-slate-200/80 bg-white py-6" aria-label="Product highlights">
        <div className="mx-auto max-w-6xl px-6 flex flex-wrap justify-center gap-6 sm:gap-10 text-center text-sm font-medium text-slate-700">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-500" aria-hidden />
            Keyword-aligned resumes per job
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-500" aria-hidden />
            Application history &amp; status
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
            Motivation letters included
          </span>
        </div>
      </section>

      {/* LinkedIn → resume */}
      <section
        className="border-b border-slate-200/80 bg-gradient-to-r from-sky-50/90 via-indigo-50/50 to-violet-50/80 py-14 sm:py-16"
        aria-labelledby="linkedin-heading"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="max-w-2xl">
              <h2 id="linkedin-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Convert your LinkedIn page into a professional resume
              </h2>
              <p className="mt-3 text-slate-600 leading-relaxed">
                Export your LinkedIn profile as JSON (or upload a PDF resume). You can upload and preview before creating
                an account; we parse it into an editable profile so you can refine details and generate tailored resumes
                and motivation letters for each job.
              </p>
            </div>
            <Link
              href="/get-started"
              className="shrink-0 inline-flex items-center justify-center rounded-xl bg-indigo-700 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-700/25 hover:bg-indigo-800 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gradient-to-b from-white to-slate-50 py-16 sm:py-20" aria-labelledby="how-it-works-heading">
        <div className="mx-auto max-w-6xl px-6">
          <h2 id="how-it-works-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl text-center">
            How it works
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600 text-lg">
            One profile. Add any job. Optimize your resume, generate your letter, and track the application on your
            dashboard.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <StepCard
              step={1}
              title="Upload your resume or build your profile"
              description="Start with your existing resume or enter your experience. We parse your content so you do not have to retype everything."
              icon={<StepOneIcon />}
              accent="bg-indigo-600 ring-indigo-200"
            />
            <StepCard
              step={2}
              title="Paste the job description"
              description="We align keywords and emphasis to that role so your resume and motivation letter read like a perfect match."
              icon={<StepTwoIcon />}
              accent="bg-teal-600 ring-teal-200"
            />
            <StepCard
              step={3}
              title="Download PDFs &amp; track the application"
              description="Save tailored resume and letter PDFs, then manage status and details from your job application dashboard."
              icon={<StepThreeIcon />}
              accent="bg-violet-600 ring-violet-200"
            />
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/get-started"
              className="inline-flex items-center rounded-xl bg-indigo-700 px-6 py-3 text-base font-semibold text-white hover:bg-indigo-800 transition-colors shadow-md shadow-indigo-700/20"
            >
              Create your first tailored resume
            </Link>
          </div>
        </div>
      </section>

      {/* Optimizer + manager split */}
      <section className="border-y border-slate-200 bg-white py-16 sm:py-20" aria-labelledby="dual-product-heading">
        <div className="mx-auto max-w-6xl px-6">
          <h2 id="dual-product-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl text-center">
            More than a resume builder
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Compared with static builders (like many “AI resume” homepages), Optimal CV is built for people who apply to
            many roles and need both optimization and organization.
          </p>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-8 shadow-sm">
              <div className="inline-flex rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                Resume optimizer
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">Tailor content to every job description</h3>
              <p className="mt-3 text-slate-600 leading-relaxed">
                Each listing gets a fresh pass: your summary, bullets, and skills are tuned to the posting so you read as
                a strong match for ATS and recruiters, not a one-size-fits-all PDF.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="text-teal-600 font-bold">✓</span> Job-specific resume PDFs
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-600 font-bold">✓</span> Matching motivation letters
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-600 font-bold">✓</span> Free ATS checker to preview fit
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-teal-100 bg-gradient-to-br from-teal-50/80 to-white p-8 shadow-sm">
              <div className="inline-flex rounded-lg bg-teal-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                Job application manager
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">Your applications, one dashboard</h3>
              <p className="mt-3 text-slate-600 leading-relaxed">
                See each role, company, and status in one place. Know which tailored resume you generated for which
                application, so follow-ups and interviews stay under control.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="text-indigo-600 font-bold">✓</span> History of tailored resumes &amp; letters
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-600 font-bold">✓</span> Track status from interested to offer
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-600 font-bold">✓</span> Re-open any application to refine content
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-100/80 py-16 sm:py-20 border-y border-slate-200/80" aria-labelledby="why-tailor-heading">
        <div className="mx-auto max-w-6xl px-6">
          <h2 id="why-tailor-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl text-center">
            Built for serious job seekers
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Generic resumes get overlooked. Optimized, role-specific applications get shortlisted.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureBlock
              title="Modern hiring &amp; ATS"
              description="Your documents are structured to align with how employers and screening tools evaluate candidates."
              icon={<TargetIcon />}
              color="text-rose-600 bg-rose-50 border-rose-100"
            />
            <FeatureBlock
              title="Match the job description"
              description="Keywords and phrasing from the role show up naturally in your resume and motivation letter."
              icon={<MatchIcon />}
              color="text-amber-600 bg-amber-50 border-amber-100"
            />
            <FeatureBlock
              title="Professional PDFs"
              description="Download clean, ATS-friendly resume and motivation letter PDFs for any job board."
              icon={<PdfIcon />}
              color="text-teal-600 bg-teal-50 border-teal-100"
            />
            <FeatureBlock
              title="Letters included"
              description="A coherent motivation letter for each application, same voice, role-specific content."
              icon={<LetterIcon />}
              color="text-violet-600 bg-violet-50 border-violet-100"
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-900 py-16 sm:py-20 text-white" aria-labelledby="reviews-heading">
        <div className="mx-auto max-w-6xl px-6">
          <h2 id="reviews-heading" className="text-2xl font-bold sm:text-3xl text-center">
            What job seekers say
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-indigo-200/90 text-sm">
            Illustrative feedback from people who use tailored resumes and application tracking in their search.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {MOCK_REVIEWS.map((r) => (
              <figure
                key={r.name}
                className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm shadow-xl"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${r.accent}`}
                  aria-hidden
                />
                <Stars />
                <blockquote className="mt-4 text-sm leading-relaxed text-slate-100">&ldquo;{r.quote}&rdquo;</blockquote>
                <figcaption className="mt-5 border-t border-white/10 pt-4">
                  <p className="font-semibold text-white">{r.name}</p>
                  <p className="text-xs text-indigo-200/90">{r.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 sm:py-20" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl px-6">
          <h2 id="faq-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl text-center">
            Frequently asked questions
          </h2>
          <ul className="mt-10 space-y-8">
            <li className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
              <h3 className="text-lg font-semibold text-slate-900">How is Optimal CV different from a regular resume builder?</h3>
              <p className="mt-2 text-slate-600 leading-relaxed">
                Most builders help you create one static document. Optimal CV is for applying to many jobs: you keep one
                profile, optimize your resume and motivation letter for each role, and track applications on your
                dashboard. Your experience is rewritten and emphasized to match what each job asks for, relevant for hiring
                managers and applicant tracking systems.
              </p>
            </li>
            <li className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
              <h3 className="text-lg font-semibold text-slate-900">Is it free?</h3>
              <p className="mt-2 text-slate-600 leading-relaxed">
                You can sign up and use Optimal CV to create job-specific resumes and motivation letters. Create an account
                to save your profile and access your generation and application history.
              </p>
            </li>
            <li className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
              <h3 className="text-lg font-semibold text-slate-900">Is my data safe?</h3>
              <p className="mt-2 text-slate-600 leading-relaxed">
                We use your profile and job descriptions only to generate your tailored documents. We do not sell your
                data. You can delete your account and all associated data at any time from your profile settings.
              </p>
            </li>
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-gradient-to-r from-teal-700 via-indigo-800 to-violet-900 py-14 sm:py-20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.06\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <p className="text-teal-100/90 text-sm font-semibold uppercase tracking-wider">Ready to optimize your next application?</p>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Make your resume impossible to ignore, per job</h2>
          <p className="mt-3 text-indigo-100 max-w-lg mx-auto text-base">
            Join job seekers who combine resume optimization with a clear view of every application, in one workspace.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/get-started"
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-indigo-900 shadow-lg hover:bg-teal-50 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="text-lg font-bold text-white tracking-tight hover:text-teal-300 transition-colors">
                Optimal CV
              </Link>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Resume optimizer and job application manager, tailor every resume and letter, then track applications from
                one dashboard.
              </p>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400/90">Product</h3>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link href="/get-started" className="hover:text-white transition-colors">
                    Get started
                  </Link>
                </li>
                <li>
                  <Link href="/cv-checker" className="hover:text-amber-300 transition-colors">
                    Free ATS resume checker
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400/90">Resources</h3>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link href="/resources" className="hover:text-white transition-colors">
                    Resources: guides &amp; tips by job title
                  </Link>
                </li>
                <li>
                  <span className="text-slate-500 text-xs block mt-3 leading-relaxed">
                    Practical guides to tailor your resume, pass ATS screening, and role-specific advice, then build your
                    tailored PDF in minutes with Optimal CV.
                  </span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90">Get hired</h3>
              <p className="mt-4 text-sm text-slate-400 leading-relaxed">
                One profile. Unlimited tailored resumes and motivation letters. Application history that stays with your
                account.
              </p>
              <Link
                href="/get-started"
                className="mt-4 inline-flex rounded-lg bg-gradient-to-r from-teal-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-teal-500 hover:to-indigo-500 transition-colors"
              >
                Build your tailored resume
              </Link>
            </div>
          </div>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 pt-8 text-xs text-slate-500">
            <span>© {new Date().getFullYear()} Optimal CV. All rights reserved.</span>
            <nav className="flex flex-wrap justify-center gap-6">
              <Link href="/resources" className="hover:text-slate-300 transition-colors">
                Resources
              </Link>
              <Link href="/cv-checker" className="hover:text-slate-300 transition-colors">
                Resume checker
              </Link>
              <Link href="/get-started" className="hover:text-slate-300 transition-colors">
                Get started
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stars() {
  return (
    <div className="flex gap-0.5 text-amber-400" aria-label="5 out of 5 stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className="h-4 w-4 fill-current" viewBox="0 0 20 20" aria-hidden>
          <path d="M10 1.5l2.6 5.28 5.82.85-4.21 4.1.99 5.8L10 14.9 4.8 17.53l1-5.8L1.58 7.63l5.82-.85L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
  icon,
  accent,
}: {
  step: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-100">
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ring-4 ${accent}`}
      >
        {step}
      </span>
      <div className="mt-4 flex justify-center text-indigo-600">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-slate-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureBlock({
  title,
  description,
  icon,
  color,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`rounded-xl border-2 p-5 shadow-sm bg-white ${color.split(' ').slice(1).join(' ')}`}>
      <div className={`inline-flex rounded-xl border-2 p-3 ${color}`}>{icon}</div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function HeroIllustration() {
  return (
    <div className="relative w-full max-w-md">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-indigo-200/40 via-teal-200/30 to-violet-200/40 blur-2xl" aria-hidden />
      <svg
        className="relative w-full h-auto drop-shadow-xl"
        viewBox="0 0 400 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect x="72" y="32" width="256" height="216" rx="12" fill="url(#g1)" stroke="#4f46e5" strokeWidth="1.5" />
        <rect x="92" y="52" width="88" height="14" rx="3" fill="#4f46e5" opacity="0.35" />
        <rect x="92" y="74" width="208" height="8" rx="2" fill="#0f766e" opacity="0.25" />
        <rect x="92" y="90" width="188" height="8" rx="2" fill="#0f766e" opacity="0.18" />
        <rect x="92" y="106" width="168" height="8" rx="2" fill="#0f766e" opacity="0.18" />
        <rect x="92" y="136" width="72" height="14" rx="3" fill="#7c3aed" opacity="0.4" />
        <rect x="92" y="158" width="208" height="8" rx="2" fill="#7c3aed" opacity="0.15" />
        <rect x="92" y="174" width="188" height="8" rx="2" fill="#7c3aed" opacity="0.12" />
        <circle cx="312" cy="92" r="44" fill="url(#g2)" stroke="#14b8a6" strokeWidth="2" />
        <path
          d="M288 92 L304 108 L332 78"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <defs>
          <linearGradient id="g1" x1="72" y1="32" x2="328" y2="248" gradientUnits="userSpaceOnUse">
            <stop stopColor="#eef2ff" />
            <stop offset="1" stopColor="#f0fdfa" />
          </linearGradient>
          <linearGradient id="g2" x1="268" y1="48" x2="356" y2="136" gradientUnits="userSpaceOnUse">
            <stop stopColor="#14b8a6" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function StepOneIcon() {
  return (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

function StepTwoIcon() {
  return (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function StepThreeIcon() {
  return (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function MatchIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function LetterIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}
