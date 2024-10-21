import { cookies } from 'next/headers';
import { getUserApiKey } from '../lib/mongodb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Key, Check } from "lucide-react";
import CopyButton from '@/components/CopyButton';
import ClientComponent from './ClientComponent';

export default async function ApiKeyPage() {
  const cookieStore = cookies();
  const username = cookieStore.get('username')?.value;

  if (!username) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-purple-400">API Key</CardTitle>
            <CardDescription className="text-gray-400">Please log in to view your API key.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const apiKey = await getUserApiKey(username);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      <ClientComponent username={username} />
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-purple-400 flex items-center">
                <Key className="mr-2" /> Your API Key
              </CardTitle>
              <CardDescription className="text-gray-400">
                Use this API key to authenticate your requests to the LLM Evaluation System.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">
                Welcome, <span className="font-semibold text-purple-400">{username}</span>!
              </p>
              {apiKey ? (
                <div>
                  <div className="bg-gray-800 p-4 rounded-md flex items-center justify-between">
                    <code className="text-purple-400 break-all">{apiKey}</code>
                    <CopyButton text={apiKey} />
                  </div>
                  <p className="mt-4 text-gray-300 text-sm flex items-center">
                    <Check className="text-green-400 mr-2 h-4 w-4" />
                    Keep this key secret. Do not share it or expose it in client-side code.
                  </p>
                </div>
              ) : (
                <p className="text-gray-300">No API key found for your account.</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
