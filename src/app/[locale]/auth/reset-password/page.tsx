import { redirect } from 'next/navigation';

interface ResetPasswordPageProps {
  searchParams: Promise<{
    email?: string;
  }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { email } = await searchParams;
  const query = email?.trim() ? `?email=${encodeURIComponent(email)}` : '';

  redirect(`/auth/forgot-password${query}`);
}
