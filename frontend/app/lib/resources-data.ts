/** SEO resources: “CV for [role]” and how-to guides. */

export type CvForRole = {
  slug: string;
  title: string;
  metaDescription: string;
  intro: string;
  tips: string[];
};

export type GuideArticle = {
  slug: string;
  title: string;
  metaDescription: string;
  intro: string;
  sections: { heading: string; body: string }[];
};

export const CV_FOR_ROLES: CvForRole[] = [
  {
    slug: 'software-engineer',
    title: 'Software Engineer',
    metaDescription:
      'How to tailor your CV for software engineer roles: keywords, structure, and ATS tips. Build a job-specific CV with Optimal CV.',
    intro:
      'Software engineering roles compete on technical depth, impact, and keyword alignment with the job description. Recruiters and ATS systems look for stacks, ownership, and measurable outcomes—not a generic “passionate developer” line.',
    tips: [
      'Mirror the job’s stack and tools (languages, frameworks, cloud, data) in your skills and bullet points where truthful.',
      'Lead with impact: shipped features, latency wins, reliability, scale, or revenue—not only responsibilities.',
      'Use one tight technical skills block aligned to the posting; drop unrelated buzzwords that dilute relevance.',
      'For each role, echo the job’s vocabulary (e.g. “CI/CD”, “microservices”, “observability”) when it matches your experience.',
      'Keep a master profile, then generate a separate CV per application so keywords stay job-specific.',
    ],
  },
  {
    slug: 'marketing-manager',
    title: 'Marketing Manager',
    metaDescription:
      'CV tips for marketing manager applications: metrics, channels, and tailoring to the job ad. Try Optimal CV for job-specific CVs.',
    intro:
      'Marketing manager CVs win on measurable outcomes—pipeline, CAC, ROAS, retention—and channel fit with the role (B2B vs B2C, product vs growth).',
    tips: [
      'Quantify: campaigns, budgets, conversion lifts, audience growth, and revenue influenced where you can.',
      'Align channel language with the job (content, performance, lifecycle, brand, product marketing).',
      'Show cross-functional work with sales, product, and analytics; hiring managers look for stakeholder fluency.',
      'Tailor your headline and summary to the company’s market and motion (SMB, enterprise, PLG).',
      'Use the job description’s phrasing for tools (HubSpot, Salesforce, GA4, etc.) when accurate.',
    ],
  },
  {
    slug: 'data-scientist',
    title: 'Data Scientist',
    metaDescription:
      'How to shape a data scientist CV for each role: modeling, experimentation, and business impact. Tailor with Optimal CV.',
    intro:
      'Data science postings mix statistics, engineering, and product sense. Your CV should reflect the blend this employer emphasizes.',
    tips: [
      'Highlight modeling approaches and domains (forecasting, NLP, causal inference) that match the posting.',
      'Name stacks honestly: Python/R, SQL, Spark, cloud ML, notebooks, and experiment platforms.',
      'Tie work to decisions: “informed pricing”, “reduced churn”, “improved ranking”—not only model accuracy.',
      'If the role is ML-engineering heavy, foreground deployment, monitoring, and production constraints.',
      'Regenerate role-specific bullets from one profile so each application stays focused.',
    ],
  },
  {
    slug: 'product-manager',
    title: 'Product Manager',
    metaDescription:
      'Product manager CV advice: outcomes, discovery, and roadmap language aligned to the job. Use Optimal CV to tailor.',
    intro:
      'PM CVs should read like a narrative of problems solved, users served, and metrics moved—using the hiring company’s product vocabulary.',
    tips: [
      'Lead with outcomes: launches, adoption, retention, revenue, or time-to-value—not only “owned roadmap”.',
      'Mirror the domain: B2B SaaS, marketplace, consumer, hardware, or internal tools as appropriate.',
      'Show discovery habits: research, experiments, data partnerships, and stakeholder alignment.',
      'Use the job’s keywords for methodologies (OKRs, agile, discovery, GTM) when they fit your work.',
      'Avoid one generic PM CV; tailor emphasis per vertical and seniority.',
    ],
  },
  {
    slug: 'registered-nurse',
    title: 'Registered Nurse',
    metaDescription:
      'CV guidance for registered nurse roles: units, certifications, and compliance keywords. Tailor your nursing CV with Optimal CV.',
    intro:
      'Clinical roles reward specificity: patient populations, acuity, charting systems, and certifications that match the facility’s needs.',
    tips: [
      'State unit types and volumes (ER, ICU, med-surg) and certifications (ACLS, BLS, specialty) clearly.',
      'Include EHR systems and protocols the job mentions when you have that experience.',
      'Emphasize patient safety, teamwork, and quality metrics your employer cares about.',
      'Tailor your professional summary to the employer type: hospital, clinic, home health, or telehealth.',
      'Keep a compliant, factual tone; let Optimal CV align wording to each job description.',
    ],
  },
  {
    slug: 'teacher',
    title: 'Teacher',
    metaDescription:
      'How to tailor a teacher CV for each school or district: curriculum, assessments, and classroom outcomes.',
    intro:
      'Teaching CVs should reflect grade levels, subjects, standards alignment, and classroom results relevant to the posting.',
    tips: [
      'Match curriculum and assessment language (state standards, IB, AP, differentiation) to the role.',
      'Quantify where possible: class size, growth data, programs led, or extracurricular impact.',
      'Include tools: LMS, classroom tech, behavior systems, and PD that appear in the job ad.',
      'Tailor your philosophy and summary to the school’s mission when authentic.',
      'Generate a fresh CV per district or school type without rewriting your whole history by hand.',
    ],
  },
  {
    slug: 'sales-representative',
    title: 'Sales Representative',
    metaDescription:
      'Sales representative CV tips: quota, cycle, and industry fit. Create tailored CVs for each sales job with Optimal CV.',
    intro:
      'Sales hiring is about proof: quota attainment, deal size, cycle length, and industry or motion match.',
    tips: [
      'Put numbers first: % of quota, ARR, pipeline generated, win rate, or rank on the team.',
      'Align motion language: SMB vs enterprise, inbound vs outbound, channel vs direct.',
      'Name CRM and sales stack (Salesforce, HubSpot, Outreach) when listed in the job.',
      'Mirror verticals the employer sells into (healthcare, fintech, manufacturing).',
      'Use one profile; tailor bullets and summary per job so relevance stays high.',
    ],
  },
  {
    slug: 'project-manager',
    title: 'Project Manager',
    metaDescription:
      'Project manager CV advice: delivery, methodology, and stakeholder scale. Tailor PM CVs with Optimal CV.',
    intro:
      'PM roles differ by methodology, domain, and scale. Your CV should echo the posting’s delivery model and constraints.',
    tips: [
      'Highlight methodology fit: Agile, Scrum, Kanban, waterfall, hybrid—use their terms when accurate.',
      'Show budget, timeline, and risk outcomes; name program scale (teams, geographies, vendors).',
      'Include tools (Jira, MS Project, Smartsheet) the employer lists.',
      'Tailor industry context: construction, IT, healthcare, consulting, etc.',
      'Per application, emphasize the slice of your portfolio that matches the role.',
    ],
  },
  {
    slug: 'graphic-designer',
    title: 'Graphic Designer',
    metaDescription:
      'Graphic designer CV tips: portfolio alignment, tools, and brand work. Job-specific CVs with Optimal CV.',
    intro:
      'Design hiring pairs visual portfolio review with CV scannability: tools, brand work, and campaign types that match the brief.',
    tips: [
      'Mirror the job’s medium: digital, print, brand, motion, UI—where your work applies.',
      'List tools (Figma, Adobe CC, After Effects) exactly as the posting does.',
      'Reference industries and deliverables they care about: social, packaging, B2B decks.',
      'Keep the CV concise; let the portfolio carry visuals—the CV carries keywords and scope.',
      'Tailor language per agency vs in-house vs startup needs.',
    ],
  },
  {
    slug: 'accountant',
    title: 'Accountant',
    metaDescription:
      'Accountant and finance CV guidance: GAAP, systems, and closing cycles. Tailor with Optimal CV.',
    intro:
      'Accounting roles hinge on standards, systems, close cadence, and industry exposure—your CV should speak that language.',
    tips: [
      'Specify GAAP/IFRS, audit vs industry, and entity type (public, nonprofit, SMB).',
      'Name ERPs and tools (NetSuite, SAP, QuickBooks) the job lists.',
      'Highlight close accuracy, reporting, tax, AP/AR, or FP&A scope as relevant.',
      'Quantify: reporting volume, team size, process improvements, or error reduction.',
      'Align your summary to the exact title: staff accountant, controller track, tax, etc.',
    ],
  },
];

export const GUIDE_ARTICLES: GuideArticle[] = [
  {
    slug: 'how-to-tailor-cv-to-job-description',
    title: 'How to tailor your CV to a job description',
    metaDescription:
      'Step-by-step: read the job description, extract keywords, mirror truthful experience, and generate a tailored CV. Use Optimal CV to automate tailoring.',
    intro:
      'Tailoring means aligning your CV’s language and emphasis with a specific posting—without inventing facts. It improves both human scanability and ATS relevance.',
    sections: [
      {
        heading: '1. Read for requirements, not titles',
        body:
          'Skim for must-haves: tools, methodologies, years of experience, domain, and outcomes. Highlight repeated phrases; those are strong keyword candidates for your summary and role bullets.',
      },
      {
        heading: '2. Map keywords to evidence',
        body:
          'For each major requirement, find a bullet or skill on your CV that proves it. If nothing matches, consider a different role or an honest gap you can close with adjacent experience.',
      },
      {
        heading: '3. Rewrite the top of your CV',
        body:
          'Adjust your headline and professional summary so they reflect the role’s focus. Use the employer’s vocabulary where it accurately describes your work.',
      },
      {
        heading: '4. Tune each position',
        body:
          'Reorder and rewrite bullets so the most relevant achievements appear first. Drop or shorten bullets that distract from this application.',
      },
      {
        heading: '5. Match skills and certifications',
        body:
          'Align your skills block with the posting’s stack and compliance needs. Keep it truthful—keyword stuffing that misrepresents you will fail interviews.',
      },
      {
        heading: '6. Use a tool for repeat applications',
        body:
          'Optimal CV keeps one profile and generates a tailored CV and motivation letter per job description, so you can apply widely without maintaining dozens of files by hand.',
      },
    ],
  },
  {
    slug: 'how-to-pass-ats-screening',
    title: 'How to pass ATS screening',
    metaDescription:
      'What applicant tracking systems look for: structure, keywords, and clarity—plus how to test your CV. Free ATS checker from Optimal CV.',
    intro:
      'ATS tools parse and rank CVs against job descriptions. You pass screening by being relevant, parseable, and specific—not by tricks that harm readability.',
    sections: [
      {
        heading: '1. Use a clear structure',
        body:
          'Standard sections (summary, experience, education, skills) and conventional headings help parsers. Avoid tables, text boxes, and heavy graphics in the document you submit unless the employer requests a designed PDF.',
      },
      {
        heading: '2. Align with the job description',
        body:
          'Modern systems use semantic matching, not only exact keywords. Still, truthful overlap with the posting’s skills and responsibilities materially helps scoring.',
      },
      {
        heading: '3. Prefer substance over gimmicks',
        body:
          'White text, keyword stuffing, and hiding text are risky and can backfire. Focus on measurable outcomes and accurate tool names.',
      },
      {
        heading: '4. Test before you apply',
        body:
          'Use Optimal CV’s free CV checker: upload your CV and job description (or URL) to see a match-style score and improvement path, then generate a tailored CV when you sign up.',
      },
      {
        heading: '5. Keep one source of truth',
        body:
          'Maintain a full profile once; generate job-specific CVs so each submission stays focused without manual copy-paste errors.',
      },
    ],
  },
  {
    slug: 'best-cv-format-2026',
    title: 'Best CV format in 2026',
    metaDescription:
      'Modern CV format for 2026: length, sections, file type, and what recruiters and ATS expect. Build tailored PDFs with Optimal CV.',
    intro:
      'The “best” format is the one that is easy to read, honest, and aligned to the role. In 2026, that still means clarity first—plus job-specific wording when you apply.',
    sections: [
      {
        heading: 'Length and layout',
        body:
          'Most candidates fit two pages for experienced roles; one page can work early-career. Use consistent dates, reverse-chronological roles, and plenty of white space.',
      },
      {
        heading: 'Sections that matter',
        body:
          'Contact, headline, summary, experience, education, and skills are standard. Add certifications and projects when they differentiate you for that job.',
      },
      {
        heading: 'File type',
        body:
          'Submit PDF unless the employer asks for Word. Ensure text is selectable so parsers and recruiters can quote your CV.',
      },
      {
        heading: 'Tailoring beats a single “perfect” template',
        body:
          'One static format with the same wording for every job underperforms. Adjust emphasis and keywords per posting while keeping facts consistent.',
      },
      {
        heading: 'Use Optimal CV for PDFs and letters',
        body:
          'Generate a tailored CV and motivation letter per job from one profile—professional layout, job-specific text, and downloadable PDFs.',
      },
    ],
  },
];

export function getCvForRole(slug: string): CvForRole | undefined {
  return CV_FOR_ROLES.find((r) => r.slug === slug);
}

export function getGuide(slug: string): GuideArticle | undefined {
  return GUIDE_ARTICLES.find((g) => g.slug === slug);
}
