/**
 * Integration/component tests for home page.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HomePage from './page';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock API module
jest.mock('./lib/api', () => ({
  parseLinkedIn: jest.fn(),
  fetchJobDescription: jest.fn(),
  fetchAdditionalUrls: jest.fn(),
  generateCV: jest.fn(),
  getSession: jest.fn(),
  downloadPdfUrl: jest.fn((id: string) => `/api/download/${id}`),
}));

const api = require('./lib/api');

const minimalStoredProfile = {
  full_name: 'Test User',
  summary: 'Test summary',
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  languages: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  (api.downloadPdfUrl as jest.Mock).mockImplementation((id: string) => `/api/download/${id}`);
  localStorage.setItem('cv-tool-profile', JSON.stringify(minimalStoredProfile));
});

describe('HomePage', () => {
  it('renders header and main form', () => {
    render(<HomePage />);
    expect(screen.getByText('Optimal CV')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit profile/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste job description...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Extra context or summary to include in your CV...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate cv/i })).toBeInTheDocument();
  });

  it('shows language selector with English default', () => {
    render(<HomePage />);
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThanOrEqual(1);
    const langSelect = comboboxes[0];
    expect(langSelect).toHaveValue('en');
  });

  it('generate button is disabled when loading after click', async () => {
    (api.generateCV as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<HomePage />);
    const jobInput = screen.getByPlaceholderText('Paste job description...');
    fireEvent.change(jobInput, { target: { value: 'We need a developer.' } });
    const summaryArea = screen.getByPlaceholderText('Extra context or summary to include in your CV...');
    fireEvent.change(summaryArea, { target: { value: 'I am a developer.' } });
    const btn = screen.getByRole('button', { name: /generate cv/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(btn).toBeDisabled();
    });
  });

  it('displays error when generate fails', async () => {
    (api.generateCV as jest.Mock).mockRejectedValueOnce(new Error('API error'));
    render(<HomePage />);
    const jobInput = screen.getByPlaceholderText('Paste job description...');
    fireEvent.change(jobInput, { target: { value: 'Job' } });
    const summaryArea = screen.getByPlaceholderText('Extra context or summary to include in your CV...');
    fireEvent.change(summaryArea, { target: { value: 'Summary' } });
    fireEvent.click(screen.getByRole('button', { name: /generate cv/i }));
    await waitFor(() => {
      expect(screen.getByText(/API error|add a linkedin|enter.*job/i)).toBeInTheDocument();
    });
  });

  it('shows download and preview after successful generate', async () => {
    (api.generateCV as jest.Mock).mockResolvedValueOnce({
      session_id: 's123',
      tailored_summary: 'Tailored summary text.',
      tailored_experience: [],
      motivation_letter: 'Dear hiring manager...',
      suggested_skills_highlight: [],
      status: 'success',
    });
    render(<HomePage />);
    const jobInput = screen.getByPlaceholderText('Paste job description...');
    fireEvent.change(jobInput, { target: { value: 'Job description' } });
    const summaryArea = screen.getByPlaceholderText('Extra context or summary to include in your CV...');
    fireEvent.change(summaryArea, { target: { value: 'My summary' } });
    fireEvent.click(screen.getByRole('button', { name: /generate cv/i }));
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /download pdf/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Tailored summary text.')).toBeInTheDocument();
    expect(screen.getByText(/Dear hiring manager/)).toBeInTheDocument();
  });
});
