'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Book, Code, TestTube, Settings, Map } from "lucide-react";
import { motion } from "framer-motion";
import Sidebar from '@/components/Sidebar';

const EvalAILibraryGuide = () => {
    const router = useRouter();

    const handleLogout = () => {
        Cookies.remove('username');
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 flex">
            <Sidebar onLogout={handleLogout} />

            <div className="flex-1 flex flex-col min-h-screen">
                <header className="bg-gray-900 shadow-lg">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <h1 className="text-2xl font-bold text-purple-400">API Reference</h1>
                    </div>
                </header>

                <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Card className="mb-8 bg-gray-900 border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-purple-400">Getting Started with EvalAI</CardTitle>
                                <CardDescription className="text-gray-400">Follow these steps to set up and use the EvalAI library for AI model evaluation.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-gray-300 space-y-6">
                                {/* Installation Section */}
                                <div>
                                    <h2 className="text-xl font-semibold text-purple-400 mb-3">1. Installation</h2>
                                    <p className="mb-2">First, install the EvalAI library using pip:</p>
                                    <pre className="bg-gray-800 p-4 rounded-md font-mono text-sm"><code>!pip install evalaii==0.3.0</code></pre>
                                </div>

                                {/* Usage Section */}
                                <div>
                                    <h2 className="text-xl font-semibold text-purple-400 mb-3">2. Basic Usage</h2>
                                    <p className="mb-2">Here's how to initialize and use the EvalAI library:</p>
                                    <pre className="bg-gray-800 p-4 rounded-md font-mono text-sm overflow-x-auto"><code>{`
from evalai.api import EvalAI

eval_ai = EvalAI()
api_key = "your_api_key_here"

# Verify API key and initialize clients
user = eval_ai.get_user_by_api_key(api_key)
if user:
    eval_ai._initialize_clients(user)
else:
    print("Error: Invalid API key")

print(f"User: {user}\\n")
# Test get_models
models_result = eval_ai.get_models(api_key)
print(f"Models: {models_result}\\n")

add_context_result = await eval_ai.add_context(api_key, "gpt-4o-mini", "./custom_context.txt")
print(f"Add Context Result: {add_context_result}\\n")

result = await eval_ai.process_prompts_file(api_key, "gpt-4o-mini", "./prompts.json")
print(f"Process Prompts Result: {result}\\n")
if result["success"]:
    print(f"Results saved to: {result['output_file']}\\n")
`}</code></pre>
                                </div>

                                {/* Notes Section */}
                                <div className="mt-4">
                                    <h2 className="text-xl font-semibold text-purple-400 mb-3">Important Notes</h2>
                                    <ul className="list-disc list-inside space-y-2 text-gray-300">
                                        <li>Make sure to replace the API key with your own</li>
                                        <li>Custom context files should be in plain text format</li>
                                        <li>Prompt files should be in JSON format</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </main>
            </div>
        </div>
    );
}

export default EvalAILibraryGuide;

export const runtime = 'edge';
