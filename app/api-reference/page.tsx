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
            {/* Sidebar */}
            <Sidebar onLogout={handleLogout} />

            {/* Main content */}
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
                                <CardTitle className="text-purple-400">How to Use EvalAI Library</CardTitle>
                                <CardDescription className="text-gray-400">A comprehensive guide to using the EvalAI library for AI model evaluation.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-gray-300">
                                <h2 className="text-xl font-semibold text-purple-400 mt-4 mb-2">1. Installation</h2>
                                <p>To install the EvalAI library, run the following command:</p>
                                <pre className="bg-gray-800 p-2 rounded-md mt-2"><code>pip install evalaii==0.2.0</code></pre>

                                <h2 className="text-xl font-semibold text-purple-400 mt-6 mb-2">2. Initialization and Authentication</h2>
                                <p>Initialize the EvalAI client and authenticate using your API key:</p>
                                <pre className="bg-gray-800 p-2 rounded-md mt-2"><code>{`
from evalai.api import EvalAI

eval_ai = EvalAI()
api_key = "your_api_key_here"

# Verify API key and initialize clients
user = eval_ai.get_user_by_api_key(api_key)
if user:
    eval_ai._initialize_clients(user)
else:
    print("Error: Invalid API key")
    `}</code></pre>

                                <h2 className="text-xl font-semibold text-purple-400 mt-6 mb-2">3. Basic Usage</h2>
                                <p>Here are some basic operations you can perform with the EvalAI library:</p>
                                <pre className="bg-gray-800 p-2 rounded-md mt-2"><code>{`
# Get user information
user = eval_ai.get_user_by_api_key(api_key)
print(f"User: {user}")

# Get available models
models = eval_ai.get_models(api_key)
print(f"Models: {models}")

# Add a new model (example with custom model)
new_model = eval_ai.add_model(
    api_key,
    "model_name",
    "custom",
    "your_model_key_here"
)
print(f"Add Model Result: {new_model}")
    `}</code></pre>

                                <h2 className="text-xl font-semibold text-purple-400 mt-6 mb-2">4. Working with Models</h2>
                                <p>Interact with models and evaluate responses:</p>
                                <pre className="bg-gray-800 p-2 rounded-md mt-2"><code>{`
# Add context to a model
context_result = eval_ai.add_context(api_key, "model_name", "path/to/context_file.txt")
print(f"Add Context Result: {context_result}")

# Get context for a prompt
context = eval_ai.get_context(api_key, "model_name", "Your prompt here")
print(f"Get Context Result: {context}")

# Evaluate a model's response
evaluation = eval_ai.evaluate(api_key, "model_name", "Your prompt here")
print(f"Evaluate Result: {evaluation}")
    `}</code></pre>

                                <h2 className="text-xl font-semibold text-purple-400 mt-6 mb-2">5. Batch Processing</h2>
                                <p>Process multiple prompts from a file:</p>
                                <pre className="bg-gray-800 p-2 rounded-md mt-2"><code>{`
result = eval_ai.process_prompts_file(api_key, "model_name", "path/to/prompts.json")
print(f"Process Prompts Result: {result}")
    `}</code></pre>

                                <h2 className="text-xl font-semibold text-purple-400 mt-6 mb-2">6. Error Handling</h2>
                                <p>Always wrap your API calls in try-except blocks to handle potential errors:</p>
                                <pre className="bg-gray-800 p-2 rounded-md mt-2"><code>{`
try:
    result = eval_ai.evaluate(api_key, "model_name", "Your prompt here")
    print(result)
except Exception as e:
    print(f"An error occurred: {e}")
    `}</code></pre>

                                <h2 className="text-xl font-semibold text-purple-400 mt-6 mb-2">7. Further Resources</h2>
                                <p>For more detailed information, please refer to the official EvalAI documentation.</p>
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
