/**
 * Unit tests for API client (fetch is mocked).
 */

import {
  parseLinkedIn,
  parseLinkedInUrl,
  fetchJobDescription,
  fetchAdditionalUrls,
  generateCV,
  getSession,
  downloadPdfUrl,
  type Profile,
} from './api';

beforeEach(() => {
  (global.fetch as jest.Mock)?.mockReset?.();
});

beforeAll(() => {
  global.fetch = jest.fn();
});

describe('parseLinkedIn', () => {
  it('sends POST with file and returns profile', async () => {
    const profile = { full_name: 'Jane', summary: '', experience: [], education: [], skills: [], certifications: [], languages: [] };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => profile });
    const file = new File(['{}'], 'profile.json', { type: 'application/json' });
    const result = await parseLinkedIn(file);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/parse-linkedin'),
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
    );
    expect(result).toEqual(profile);
  });

  it('throws on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ detail: 'Invalid file' }) });
    const file = new File([''], 'x.json', { type: 'application/json' });
    await expect(parseLinkedIn(file)).rejects.toThrow('Invalid file');
  });
});

describe('parseLinkedInUrl', () => {
  it('sends POST with url and returns profile', async () => {
    const profile = { full_name: 'Scraped User', summary: '', experience: [], education: [], skills: [], certifications: [], languages: [] };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => profile });
    const result = await parseLinkedInUrl('https://linkedin.com/in/testuser');
    expect(result.full_name).toBe('Scraped User');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/parse-linkedin-url'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ url: 'https://linkedin.com/in/testuser' }) })
    );
  });
});

describe('fetchJobDescription', () => {
  it('sends text and returns content', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ content: 'Job text', source: 'text' }) });
    const result = await fetchJobDescription(null, 'Job text');
    expect(result.content).toBe('Job text');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/fetch-job-description'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Job text' }),
      })
    );
  });

  it('sends url when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ content: 'Fetched', source: 'url' }) });
    await fetchJobDescription('https://example.com/job', null);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify({ url: 'https://example.com/job' }) })
    );
  });
});

describe('fetchAdditionalUrls', () => {
  it('sends urls and returns contents', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ contents: { 'https://a.com': 'Text' } }) });
    const result = await fetchAdditionalUrls(['https://a.com']);
    expect(result.contents).toEqual({ 'https://a.com': 'Text' });
  });
});

describe('generateCV', () => {
  const minimalProfile: Profile = {
    full_name: 'Test',
    summary: '',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
  };

  it('sends request and returns response', async () => {
    const response = {
      session_id: 'sid-123',
      tailored_summary: 'Summary',
      tailored_experience: [],
      motivation_letter: 'Letter',
      suggested_skills_highlight: [],
      status: 'success',
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => response });
    const result = await generateCV({
      profile: minimalProfile,
      job_description: 'Job',
      additional_urls: [],
      language: 'en',
    });
    expect(result.session_id).toBe('sid-123');
    expect(result.tailored_summary).toBe('Summary');
    expect(result.motivation_letter).toBe('Letter');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/generate-cv'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('throws on error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ detail: 'Server error' }) });
    await expect(
      generateCV({
        profile: minimalProfile,
        job_description: 'Job',
        additional_urls: [],
        language: 'en',
      })
    ).rejects.toThrow('Server error');
  });
});

describe('getSession', () => {
  it('fetches session by id', async () => {
    const data = { session_id: 's1', has_pdf: true, tailored_summary: 'S', motivation_letter: 'L' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => data });
    const result = await getSession('s1');
    expect(result.session_id).toBe('s1');
    expect(result.has_pdf).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/session/s1'));
  });

  it('throws when not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    await expect(getSession('missing')).rejects.toThrow();
  });
});

describe('downloadPdfUrl', () => {
  it('returns URL for session', () => {
    const url = downloadPdfUrl('session-abc');
    expect(url).toContain('download-pdf');
    expect(url).toContain('session-abc');
  });
});
