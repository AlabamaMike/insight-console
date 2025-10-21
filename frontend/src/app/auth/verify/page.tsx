'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyMagicLink } from '@/lib/api/auth';
import { saveAuthTokens, saveUser } from '@/lib/auth';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const verify = async () => {
      const token = searchParams.get('token');
      const email = searchParams.get('email');

      if (!token || !email) {
        setError('Invalid link. Missing token or email.');
        setVerifying(false);
        return;
      }

      try {
        const response = await verifyMagicLink(token, email);

        // Save auth tokens and user data
        saveAuthTokens(response.accessToken, response.refreshToken);
        saveUser(response.user);

        // Redirect to dashboard
        router.push('/');
      } catch (err: any) {
        if (err.response?.data?.error) {
          setError(err.response.data.error);
        } else {
          setError('Invalid or expired link. Please request a new one.');
        }
        setVerifying(false);
      }
    };

    verify();
  }, [searchParams, router]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-900">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying...</h2>
            <p className="text-gray-600">Please wait while we log you in.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-900 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Request a new link
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-900">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
          </div>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
