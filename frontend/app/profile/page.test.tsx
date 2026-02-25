/**
 * Component tests for profile edit page.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfilePage from './page';

jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('ProfilePage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders profile form and save button', () => {
    render(<ProfilePage />);
    expect(screen.getByText(/edit profile/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to generator/i })).toBeInTheDocument();
    expect(screen.getByText('Full name')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument();
  });

  it('updates full name on input', () => {
    render(<ProfilePage />);
    const inputs = screen.getAllByRole('textbox');
    const nameInput = inputs[0];
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    expect(nameInput).toHaveValue('John Doe');
  });

  it('shows Experience and Education sections with Add buttons', () => {
    render(<ProfilePage />);
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText('Education')).toBeInTheDocument();
    const addButtons = screen.getAllByRole('button', { name: /add/i });
    expect(addButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('save profile shows saved message', () => {
    render(<ProfilePage />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Jane' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));
    expect(screen.getByText(/saved/i)).toBeInTheDocument();
  });

  it('skills textarea accepts comma-separated values', () => {
    render(<ProfilePage />);
    const skillsArea = screen.getByPlaceholderText(/python.*javascript/i);
    fireEvent.change(skillsArea, { target: { value: 'Python, JavaScript, SQL' } });
    expect(skillsArea).toHaveValue('Python, JavaScript, SQL');
  });
});
