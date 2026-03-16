import { redirect } from 'next/navigation';

/**
 * SEO-friendly entry for new users. Onboarding flow lives on home;
 * this route provides a stable URL for "Get started" links.
 */
export default function GetStartedPage() {
  redirect('/');
}
