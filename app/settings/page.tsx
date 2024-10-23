'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/settings/update-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ openai_api_key: apiKey }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('API key updated successfully');
        setApiKey('');
      } else {
        setMessage(data.error || 'Failed to update API key');
      }
    } catch (error) {
      setMessage('An error occurred while updating the API key');
    }
  };

  const handleLogout = () => {
    Cookies.remove('username');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Sidebar */}
      <Sidebar onLogout={handleLogout} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-gray-900 shadow-lg lg:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-purple-400">Settings</h1>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-6 w-6 text-gray-300" />
            </Button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-purple-400">OpenAI API Key</CardTitle>
              <CardDescription className="text-gray-400">
                Update your OpenAI API key for model evaluations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300">
                    API Key
                  </label>
                  <input
                    type="password"
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 shadow-sm focus:border-purple-400 focus:ring-purple-400"
                    placeholder="Enter your OpenAI API key"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Update API Key
                </Button>
              </form>
              {message && (
                <p className={`mt-4 text-sm ${message.includes('error') ? 'text-red-400' : 'text-green-400'}`}>
                  {message}
                </p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}
