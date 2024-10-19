'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import {
  Button
} from "@/components/ui/button";
import {
  Input
} from "@/components/ui/input";
import {
  Label
} from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group";
import {
  ScrollArea
} from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, Menu, LayoutDashboard, TestTube, Settings, Map, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import Sidebar from '@/components/Sidebar';

// Define the Model interface
interface Model {
  model_id: string;
  model_type: string;
  model_name: string;
  uploaded_at: string;
  api_key: string; // Changed to required
}

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export default function ManageModels() {
  const [username, setUsername] = useState<string>('');
  const [modelType, setModelType] = useState<string>('simple');
  const [simpleName, setSimpleName] = useState<string>('');
  const [customSelection, setCustomSelection] = useState<string>('');
  const [hfName, setHfName] = useState<string>('');
  const [hfEndpoint, setHfEndpoint] = useState<string>('');
  const [hfToken, setHfToken] = useState<string>('');
  const [addStatus, setAddStatus] = useState<string>('');
  const [existingModels, setExistingModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [customApiKeys, setCustomApiKeys] = useState<{ [key: string]: string }>({});
  const router = useRouter();

  useEffect(() => {
    const storedUsername = Cookies.get('username');
    if (storedUsername) {
      setUsername(storedUsername);
      fetchExistingModels(storedUsername);
    } else {
      router.push('/login');
    }
  }, [router]);

  const toggleManageFields = (selectedType: string) => {
    setModelType(selectedType);
    setAddStatus(''); // Clear any existing status messages
    // Reset all fields when switching types
    setSimpleName('');
    setCustomSelection('');
    setHfName('');
    setHfEndpoint('');
    setHfToken('');
  };

  const handleAddModel = async () => {
    if (!username) {
      setAddStatus('User not authenticated.');
      return;
    }

    let modelName = '';
    let modelTypeValue = '';

    switch (modelType) {
      case 'simple':
        modelName = simpleName.trim();
        modelTypeValue = 'simple';
        break;
      case 'custom':
        modelName = customSelection.trim();
        modelTypeValue = 'custom';
        break;
      case 'huggingface':
        modelName = hfName.trim();
        modelTypeValue = 'huggingface';
        break;
      default:
        setAddStatus('Please select a valid model type.');
        return;
    }

    // Frontend Validation
    if (!modelName) {
      setAddStatus('Model name is required.');
      return;
    }

    if (modelType === 'custom' && !customApiKey.trim()) {
      setAddStatus('API key is required for custom models.');
      return;
    }

    console.log('Submitting Model:', {
      username,
      modelName,
      modelType: modelTypeValue,
      hfEndpoint,
      hfToken,
    });

    setIsLoading(true);

    try {
      const response = await fetch('/api/manage-models/add-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          modelName,
          modelType: modelTypeValue,
          hfEndpoint: modelTypeValue === 'huggingface' ? hfEndpoint.trim() : null,
          hfToken: modelTypeValue === 'huggingface' ? hfToken.trim() : null,
          customApiKey: modelTypeValue === 'custom' ? customApiKey.trim() : null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setAddStatus(result.message);
        fetchExistingModels(username);
        // Clear input fields after successful addition
        setSimpleName('');
        setCustomSelection('');
        setHfName('');
        setHfEndpoint('');
        setHfToken('');
        setModelType('simple'); // Reset to default
      } else {
        // Display specific error messages from backend
        setAddStatus(result.message || 'Failed to add model.');
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      setAddStatus('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExistingModels = async (username: string) => {
    try {
      const response = await fetch(`/api/manage-models/get-models?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      console.log(data.models);
      if (response.ok && data.success && Array.isArray(data.models)) {
        setExistingModels(data.models);
      } else {
        setExistingModels([]);
        console.error('Failed to fetch models or invalid data:', data);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setExistingModels([]);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!username) {
      setAddStatus('User not authenticated.');
      return;
    }

    try {
      const response = await fetch('/api/delete-model', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          modelId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setAddStatus(result.message);
        fetchExistingModels(username);
      } else {
        setAddStatus(result.message || 'Failed to delete model.');
      }
    } catch (error) {
      console.error('Delete Error:', error);
      setAddStatus('An unexpected error occurred during deletion.');
    }
  };

  const handleLogout = () => {
    Cookies.remove('username');
    router.push('/login');
  };

  const handleCustomApiKeyChange = (modelId: string, apiKey: string) => {
    setCustomApiKeys(prev => ({ ...prev, [modelId]: apiKey }));
  };

  const handleSaveApiKey = async (modelId: string) => {
    if (!customApiKeys[modelId]?.trim()) {
      setAddStatus('API key cannot be empty.');
      return;
    }

    try {
      const response = await fetch('/api/manage-models/update-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          modelId,
          apiKey: customApiKeys[modelId],
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setAddStatus('API key updated successfully');
        fetchExistingModels(username); // Refresh the model list
      } else {
        setAddStatus(result.message || 'Failed to update API key');
      }
    } catch (error) {
      console.error('Error updating API key:', error);
      setAddStatus('An unexpected error occurred while updating the API key');
    }
  };

  if (!username) {
    return null; // or a loading spinner
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Sidebar */}
      <Sidebar onLogout={handleLogout} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-gray-900 shadow-lg lg:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-purple-400">AI Evaluation Dashboard</h1>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-6 w-6 text-gray-300" />
            </Button>
          </div>
        </header>
        <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="mb-8 bg-gray-800 border-gray-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Add a New Model</CardTitle>
                <CardDescription className="text-gray-300">Select the type of model you want to add.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Model Type Selection */}
                  <div>
                    <Label htmlFor="model-type" className="text-white">Select Model Type:</Label>
                    <RadioGroup
                      value={modelType}
                      onValueChange={(value: string) => toggleManageFields(value)}
                      id="model-type"
                      className="mt-2 flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="simple" id="simple" />
                        <Label htmlFor="simple" className="text-white">Simple Model</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="custom" />
                        <Label htmlFor="custom" className="text-white">Custom Model</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="huggingface" id="huggingface" />
                        <Label htmlFor="huggingface" className="text-white">Hugging Face</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Conditional Fields Based on Model Type */}
                  {modelType === 'simple' && (
                    <div>
                      <Label htmlFor="simple-model-name" className="text-white">Enter New Model Name:</Label>
                      <Input
                        id="simple-model-name"
                        value={simpleName}
                        onChange={(e) => setSimpleName(e.target.value)}
                        className="mt-1 bg-gray-700 text-white"
                        placeholder="e.g., my-simple-model"
                      />
                    </div>
                  )}

                  {modelType === 'custom' && (
                    <div>
                      <Label htmlFor="custom-model-selection" className="text-white">Select Custom Model:</Label>
                      <Select value={customSelection} onValueChange={(value) => setCustomSelection(value)}>
                        <SelectTrigger className="mt-1 bg-gray-700 text-white">
                          <SelectValue placeholder="Select a custom model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                          <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                          <SelectItem value="claude-3-sonnet">Claude 3.5 Sonnet</SelectItem>
                          <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                        </SelectContent>
                      </Select>
                      <Label htmlFor="custom-api-key" className="text-white mt-4">Enter API Key:</Label>
                      <Input
                        id="custom-api-key"
                        type="password"
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        className="mt-1 bg-gray-700 text-white"
                        placeholder="Your API Key for the selected model"
                      />
                    </div>
                  )}

                  {modelType === 'huggingface' && (
                    <>
                      <div>
                        <Label htmlFor="hf-model-name" className="text-white">Enter Hugging Face Model Name:</Label>
                        <Input
                          id="hf-model-name"
                          value={hfName}
                          onChange={(e) => setHfName(e.target.value)}
                          className="mt-1 bg-gray-700 text-white"
                          placeholder="e.g., gpt-4o-hf"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hf-endpoint" className="text-white">Enter Hugging Face API Endpoint:</Label>
                        <Input
                          id="hf-endpoint"
                          value={hfEndpoint}
                          onChange={(e) => setHfEndpoint(e.target.value)}
                          className="mt-1 bg-gray-700 text-white"
                          placeholder="https://api.huggingface.co/..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="hf-token" className="text-white">Enter Hugging Face API Token:</Label>
                        <Input
                          id="hf-token"
                          type="password"
                          value={hfToken}
                          onChange={(e) => setHfToken(e.target.value)}
                          className="mt-1 bg-gray-700 text-white"
                          placeholder="Your Hugging Face API Token"
                        />
                      </div>
                    </>
                  )}

                  <Button
                    onClick={handleAddModel}
                    disabled={
                      !modelType ||
                      (modelType === 'simple' && !simpleName.trim()) ||
                      (modelType === 'custom' && !customSelection.trim()) ||
                      (modelType === 'huggingface' && (!hfName.trim() || !hfEndpoint.trim() || !hfToken.trim()))
                    }
                    className="mt-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500 disabled:bg-gray-500"
                  >
                    {isLoading ? 'Adding Model...' : `Add ${modelType.charAt(0).toUpperCase() + modelType.slice(1)} Model`}
                  </Button>

                  {addStatus && (
                    <p
                      className={`mt-2 ${
                        addStatus.toLowerCase().includes('success') ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {addStatus}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-gray-800 border-gray-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Your Models</CardTitle>
                <CardDescription className="text-gray-300">Manage your existing models.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] p-2 bg-gray-800 rounded-lg">
                  <div className="space-y-4">
                    {existingModels.length === 0 ? (
                      <p className="text-white">No models found.</p>
                    ) : (
                      existingModels.map((model: Model) => (
                        <div key={model.model_id} className="rounded-lg bg-gray-700 p-4 text-white">
                          <p>
                            <strong>Model ID:</strong> {model.model_id}
                          </p>
                          <p>
                            <strong>Model Type:</strong> {capitalize(model.model_type)}
                          </p>
                          <p>
                            <strong>Model Name:</strong> {model.model_name}
                          </p>
                          <p>
                            <strong>Uploaded at:</strong> {new Date(model.uploaded_at).toLocaleString()}
                          </p>
                          {model.model_type === 'custom' && (
                            <div className="mt-2">
                              <Label htmlFor={`api-key-${model.model_id}`} className="text-white">API Key:</Label>
                              <Input
                                id={`api-key-${model.model_id}`}
                                type="password"
                                value={customApiKeys[model.model_id] || model.api_key || ''}
                                onChange={(e) => handleCustomApiKeyChange(model.model_id, e.target.value)}
                                className="mt-1 bg-gray-600 text-white"
                                placeholder="Enter API Key"
                                required
                              />
                              <Button
                                onClick={() => handleSaveApiKey(model.model_id)}
                                className="mt-2 bg-green-600 hover:bg-green-700"
                                disabled={!customApiKeys[model.model_id]?.trim() && !model.api_key}
                              >
                                Save API Key
                              </Button>
                            </div>
                          )}
                          <Button
                            variant="destructive"
                            className="mt-2 bg-red-600 hover:bg-red-700 active:bg-red-800 focus:ring-red-500"
                            onClick={() => handleDeleteModel(model.model_id)}
                          >
                            Delete
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
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
