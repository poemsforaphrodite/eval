'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaUser, FaLock } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import Cookies from 'js-cookie';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
        // Set cookie and redirect to dashboard
        Cookies.set('username', username);
        router.push('/dashboard');
        router.refresh();
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
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Google OAuth
        window.location.href = data.url;
      } else {
        setError('Failed to initiate Google login');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during Google login.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="bg-gray-900 border-gray-800 shadow-lg shadow-purple-500/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold text-center text-purple-400">Welcome Back</CardTitle>
            <CardDescription className="text-gray-400 text-center">Enter your credentials to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              className="w-full bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 flex items-center justify-center space-x-2 h-11"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                {/* Google icon paths */}
              </svg>
              <span>Continue with Google</span>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-900 px-2 text-gray-400">Or continue with</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-gray-300">Username</label>
                <div className="relative">
                  <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-gray-100"
                    placeholder="Enter your username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-300">Password</label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-gray-100"
                    placeholder="Enter your password"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-purple-500 hover:bg-purple-600 text-white">
                Sign In
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-gray-400 text-center">
              Don't have an account?
            </div>
            <Link href="/signup" className="w-full">
              <Button
                variant="outline"
                className="w-full bg-gray-800 text-purple-400 border-purple-400 hover:bg-purple-400 hover:text-white transition-all duration-200"
              >
                Sign Up
              </Button>
            </Link>
            <p className="text-xs text-gray-500 text-center mt-2">
              By signing up, you agree to our{' '}
              <Link href="/terms" className="text-purple-400 hover:underline">Terms of Use</Link>{' '}
              and{' '}
              <Link href="/privacy-policy" className="text-purple-400 hover:underline">Privacy Policy</Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
