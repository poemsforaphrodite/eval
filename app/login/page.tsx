'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, Mail } from "lucide-react";
import Image from 'next/image';
import ICON from '/public/ICON.jpg'; // Adjust the path if needed

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        Cookies.set('username', username);
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await fetch('/api/auth/google/login', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url; // Redirect to Google OAuth URL
      }
    } catch (error) {
      setError('Google login failed. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Image src={ICON} alt="Icon" width={96} height={96} className="rounded-full" />
          <h2 className="mt-6 text-3xl font-bold">Welcome to Eval AI</h2>
        </div>
        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleGoogleLogin}
          >
            <span className="mr-2 font-bold">G</span>
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="w-full bg-gray-800 hover:bg-gray-700 text-white"
            onClick={() => setShowEmailForm(!showEmailForm)}
          >
            Continue with Email
          </Button>
          {showEmailForm && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-gray-800 text-white border-gray-700"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-800 text-white border-gray-700"
              />
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Log In
              </Button>
            </form>
          )}
          <Link href="/signup" className="w-full">
            <Button variant="outline" className="w-full bg-gray-800 hover:bg-gray-700 text-white mt-4">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
      <p className="text-center text-sm text-gray-500 mt-8 absolute bottom-4">
        By signing up, you agree to our{' '}
        <Link href="/terms" className="font-medium text-blue-600 hover:underline">
          Terms of Use
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="font-medium text-blue-600 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
