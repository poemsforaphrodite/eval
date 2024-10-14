'use client';

import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PlayCircle, Upload, LogOut, Menu } from "lucide-react";
import Link from 'next/link';
import { motion } from "framer-motion";
import { useRouter } from 'next/navigation';

interface Model {
  model_name: string;
  model_type: string;
}

export default function PromptTestingPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [inputType, setInputType] = useState<string>('text');
  const [file, setFile] = useState<File | null>(null);
  const [contextDataset, setContextDataset] = useState<string | null>(null);
  const [questionsJson, setQuestionsJson] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Add new state variables for Prompt JSON and Context TXT
  const [promptJson, setPromptJson] = useState<string | null>(null);
  const [contextTxt, setContextTxt] = useState<string | null>(null);

  useEffect(() => {
    const user = Cookies.get('username');
    if (user) {
      setUsername(user);
      fetchUserModels(user);
    } else {
      setErrors(['User not authenticated.']);
    }
  }, []);

  const fetchUserModels = async (user: string) => {
    try {
      const response = await axios.get(`/api/manage-models/get-models?username=${user}`);
      setModels(response.data.models);
    } catch (error) {
      setErrors(['Failed to fetch user models.']);
    }
  };

  const handleModelSelection = (model: string) => {
    setSelectedModel(model);
    const modelType = model.split(' (')[1].replace(')', '').toLowerCase();
    if (modelType === 'simple') {
      setInputType('text');
    } else if (modelType === 'custom' || modelType === 'huggingface') {
      setInputType('text');
    }
    setFile(null);
    setContextDataset(null);
    setQuestionsJson(null);
    setSuccess('');
    setErrors([]);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setSuccess('File selected successfully!');
      setErrors([]);
    }
  };

  // Add handlers for uploading Prompt JSON
  const handlePromptJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const promptData = JSON.parse(reader.result as string);
          setPromptJson(JSON.stringify(promptData));
          setSuccess('Prompt JSON uploaded successfully!');
          setErrors([]);
        } catch {
          setErrors(['Invalid Prompt JSON format. Please check your file.']);
        }
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  // Add handlers for uploading Context TXT
  const handleContextTxtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        setContextTxt(reader.result as string);
        setSuccess('Context TXT uploaded successfully!');
        setErrors([]);
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  const handleRunTest = async () => {
    setErrors([]);
    setSuccess('');
    
    if (!selectedModel) {
      setErrors(['Please select a valid model.']);
      return;
    }

    console.log('Selected model:', selectedModel);
    const modelType = selectedModel.split(' (')[1].replace(')', '').toLowerCase();
    console.log('Model type:', modelType);

    if (modelType === 'simple') {
      if (!file) {
        setErrors(['Please upload a valid test data JSON file.']);
        return;
      }
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const testData = JSON.parse(reader.result as string);
            console.log('Parsed JSON data:', testData);
            setLoading(true);
            const apiUrl = `/api/models/simple`;
            console.log('API URL:', apiUrl);
            const response = await axios.post(apiUrl, { testData, username, modelName: selectedModel });
            console.log('API response:', response);
            setSuccess('Simple model evaluations completed successfully.');
            // You can add more logic here to handle the evaluation results
          } catch (error) {
            console.error('Error in API call or JSON parsing:', error);
            setErrors(['Invalid JSON format or API error. Please check your file and try again.']);
          } finally {
            setLoading(false);
          }
        };
        reader.readAsText(file);
      } catch (error) {
        console.error('Error processing uploaded file:', error);
        setErrors(['Failed to process the uploaded file.']);
      }
    } else if (modelType === 'custom' || modelType === 'huggingface') {
      if (!promptJson || !contextTxt) {
        setErrors(['Please upload both Prompt JSON and Context TXT files.']);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.post('/api/models/custom', {
          username,
          modelName: selectedModel,
          promptJson,
          contextTxt,
        });

        if (response.data.success) {
          setSuccess('Custom model evaluations are running successfully.');
        } else {
          setErrors([response.data.message || 'Failed to run custom model evaluations.']);
        }
      } catch (error: any) {
        console.error('Error running custom model evaluations:', error);
        setErrors(['An error occurred while running custom model evaluations. Please try again.']);
      } finally {
        setLoading(false);
      }
    }

    if (!loading && !errors.length) {
      setSuccess('Evaluations completed. You can now view the results.');
    }
  };

  const handleLogout = () => {
    Cookies.remove('username');
    router.push('/login');
  };

  const modelOptions = models.map(model => `${model.model_name} (${model.model_type.charAt(0).toUpperCase() + model.model_type.slice(1)})`);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <aside className={`bg-gray-800 w-64 min-h-screen flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static z-30`}>
        <div className="p-4">
          <h1 className="text-2xl font-bold text-white mb-6">AI Evaluation</h1>
        </div>
        <nav className="flex-1 flex flex-col">
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-gray-700">
              Dashboard
            </Button>
          </Link>
          <Link href="/prompt-testing">
            <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-gray-700">
              Prompt Testing
            </Button>
          </Link>
          <Link href="/manage-models">
            <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-gray-700">
              Manage Models
            </Button>
          </Link>
          <Link href="/umap">
            <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-gray-700">
              UMAP Visualization
            </Button>
          </Link>
        </nav>
        <div className="p-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:text-white hover:bg-gray-700"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-gray-800 shadow-lg lg:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">AI Evaluation Dashboard</h1>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-6 w-6 text-white" />
            </Button>
          </div>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="mb-8 bg-gray-800 border-gray-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Prompt Testing</CardTitle>
                <CardDescription className="text-gray-300">Test your AI models with various inputs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {errors.length > 0 && (
                  <div className="bg-red-900 text-white p-3 rounded-md">
                    {errors.map((error, idx) => (
                      <p key={idx}>{error}</p>
                    ))}
                  </div>
                )}
                {success && (
                  <div className="bg-green-900 text-white p-3 rounded-md">
                    <p>{success}</p>
                  </div>
                )}
                {!errors.length && models.length === 0 && (
                  <div className="bg-yellow-900 text-white p-3 rounded-md">
                    <p>You have no uploaded models. Please upload a model first.</p>
                  </div>
                )}
                {models.length > 0 && (
                  <>
                    <div>
                      <Label htmlFor="model-select" className="text-white text-lg mb-2 block">Select a Model for Testing</Label>
                      <Select value={selectedModel} onValueChange={handleModelSelection}>
                        <SelectTrigger id="model-select" className="bg-gray-700 text-white border-gray-600">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 text-white border-gray-600">
                          {modelOptions.map((option, idx) => (
                            <SelectItem key={idx} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedModel && (() => {
                      const modelType = selectedModel.split(' (')[1].replace(')', '').toLowerCase();
                      if (modelType !== 'custom' && modelType !== 'huggingface') {
                        return (
                          <>
                            <div>
                              <Label className="text-white text-lg mb-2 block">Input for Model Testing</Label>
                              <RadioGroup value={inputType} onValueChange={setInputType} className="flex space-x-4">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="text" id="text" />
                                  <Label htmlFor="text" className="text-white">Text</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="audio" id="audio" />
                                  <Label htmlFor="audio" className="text-white">Audio</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="image" id="image" />
                                  <Label htmlFor="image" className="text-white">Image</Label>
                                </div>
                              </RadioGroup>
                            </div>

                            {inputType === 'text' && (
                              <div>
                                {(() => {
                                  const modelType = selectedModel.split(' (')[1].replace(')', '').toLowerCase();
                                  if (modelType === 'simple') {
                                    return (
                                      <div>
                                        <Label className="text-white text-lg mb-2 block">Upload Test Data JSON</Label>
                                        <div
                                          className="border-2 border-dashed border-gray-500 rounded-lg p-6 text-center cursor-pointer hover:border-gray-300 transition-colors"
                                          onDragOver={(e) => e.preventDefault()}
                                          onDrop={(e) => {
                                            e.preventDefault();
                                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                              setFile(e.dataTransfer.files[0]);
                                              setSuccess('File dropped successfully!');
                                              setErrors([]);
                                            }
                                          }}
                                        >
                                          <Input
                                            type="file"
                                            className="hidden"
                                            onChange={handleFileChange}
                                            accept=".json"
                                            id="file-upload"
                                          />
                                          <Label htmlFor="file-upload" className="cursor-pointer">
                                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                            <p className="mt-2 text-sm text-white">
                                              Drag and drop file here or click to upload
                                            </p>
                                            <p className="mt-1 text-xs text-gray-400">
                                              Limit 200MB per file • JSON
                                            </p>
                                          </Label>
                                        </div>
                                        {file && (
                                          <p className="mt-2 text-sm text-white">
                                            Selected file: {file.name}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  } else if (modelType === 'custom' || modelType === 'huggingface') {
                                    return (
                                      <div>
                                        <Label>Upload Context Dataset (TXT)</Label>
                                        <Input
                                          type="file"
                                          onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                              const reader = new FileReader();
                                              reader.onload = () => {
                                                setContextDataset(reader.result as string);
                                                setSuccess('Context file uploaded successfully!');
                                                setErrors([]);
                                              };
                                              reader.readAsText(e.target.files[0]);
                                            }
                                          }}
                                          accept=".txt"
                                        />
                                        {contextDataset && (
                                          <p className="mt-2 text-sm text-white">
                                            Context file uploaded: {contextDataset.substring(0, 20)}...
                                          </p>
                                        )}

                                        <Label className="mt-4">Upload Questions JSON</Label>
                                        <Input
                                          type="file"
                                          onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                              const reader = new FileReader();
                                              reader.onload = () => {
                                                try {
                                                  const questions = JSON.parse(reader.result as string);
                                                  setQuestionsJson(JSON.stringify(questions));
                                                  setSuccess('Questions file uploaded successfully!');
                                                  setErrors([]);
                                                } catch {
                                                  setErrors(['Invalid Questions JSON format. Please check your file.']);
                                                }
                                              };
                                              reader.readAsText(e.target.files[0]);
                                            }
                                          }}
                                          accept=".json"
                                        />
                                        {questionsJson && (
                                          <p className="mt-2 text-sm text-white">
                                            Questions file uploaded: {questionsJson.substring(0, 20)}...
                                          </p>
                                        )}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )}

                            {inputType === 'audio' && (
                              <div className="space-y-6">
                                <Label className="text-white text-lg mb-2 block">Upload Audio Files</Label>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="prompt-audio" className="text-white text-sm mb-1 block">Prompt Audio</Label>
                                    <div
                                      className="border-2 border-dashed border-gray-500 rounded-lg p-4 text-center cursor-pointer hover:border-gray-300 transition-colors"
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                          // Handle prompt_audio upload
                                          setSuccess('Prompt audio dropped successfully!');
                                          setErrors([]);
                                        }
                                      }}
                                    >
                                      <Input
                                        type="file"
                                        id="prompt-audio"
                                        accept=".mp3,.wav"
                                        className="hidden"
                                        onChange={(e) => {
                                          // Handle prompt_audio upload
                                          setSuccess('Prompt audio uploaded successfully!');
                                          setErrors([]);
                                        }}
                                      />
                                      <Label htmlFor="prompt-audio" className="cursor-pointer">
                                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                        <p className="mt-1 text-sm text-white">
                                          Drag and drop or click to upload Prompt Audio
                                        </p>
                                        <p className="mt-1 text-xs text-gray-400">
                                          Limit 200MB per file • MP3, WAV
                                        </p>
                                      </Label>
                                    </div>
                                  </div>
                                  <div>
                                    <Label htmlFor="context-audio" className="text-white text-sm mb-1 block">Context Audio</Label>
                                    <div
                                      className="border-2 border-dashed border-gray-500 rounded-lg p-4 text-center cursor-pointer hover:border-gray-300 transition-colors"
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                          // Handle context_audio upload
                                          setSuccess('Context audio dropped successfully!');
                                          setErrors([]);
                                        }
                                      }}
                                    >
                                      <Input
                                        type="file"
                                        id="context-audio"
                                        accept=".mp3,.wav"
                                        className="hidden"
                                        onChange={(e) => {
                                          // Handle context_audio upload
                                          setSuccess('Context audio uploaded successfully!');
                                          setErrors([]);
                                        }}
                                      />
                                      <Label htmlFor="context-audio" className="cursor-pointer">
                                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                        <p className="mt-1 text-sm text-white">
                                          Drag and drop or click to upload Context Audio
                                        </p>
                                        <p className="mt-1 text-xs text-gray-400">
                                          Limit 200MB per file • MP3, WAV
                                        </p>
                                      </Label>
                                    </div>
                                  </div>
                                  <div>
                                    <Label htmlFor="response-audio" className="text-white text-sm mb-1 block">Response Audio</Label>
                                    <div
                                      className="border-2 border-dashed border-gray-500 rounded-lg p-4 text-center cursor-pointer hover:border-gray-300 transition-colors"
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                          // Handle response_audio upload
                                          setSuccess('Response audio dropped successfully!');
                                          setErrors([]);
                                        }
                                      }}
                                    >
                                      <Input
                                        type="file"
                                        id="response-audio"
                                        accept=".mp3,.wav"
                                        className="hidden"
                                        onChange={(e) => {
                                          // Handle response_audio upload
                                          setSuccess('Response audio uploaded successfully!');
                                          setErrors([]);
                                        }}
                                      />
                                      <Label htmlFor="response-audio" className="cursor-pointer">
                                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                        <p className="mt-1 text-sm text-white">
                                          Drag and drop or click to upload Response Audio
                                        </p>
                                        <p className="mt-1 text-xs text-gray-400">
                                          Limit 200MB per file • MP3, WAV
                                        </p>
                                      </Label>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {inputType === 'image' && (
                              <div className="space-y-6">
                                <Label className="text-white text-lg mb-2 block">Upload Image Files</Label>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="prompt-image" className="text-white text-sm mb-1 block">Prompt Image</Label>
                                    <div
                                      className="border-2 border-dashed border-gray-500 rounded-lg p-4 text-center cursor-pointer hover:border-gray-300 transition-colors"
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                          // Handle prompt_image upload
                                          setSuccess('Prompt image dropped successfully!');
                                          setErrors([]);
                                        }
                                      }}
                                    >
                                      <Input
                                        type="file"
                                        id="prompt-image"
                                        accept=".png,.jpg,.jpeg"
                                        className="hidden"
                                        onChange={(e) => {
                                          // Handle prompt_image upload
                                          setSuccess('Prompt image uploaded successfully!');
                                          setErrors([]);
                                        }}
                                      />
                                      <Label htmlFor="prompt-image" className="cursor-pointer">
                                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                        <p className="mt-1 text-sm text-white">
                                          Drag and drop or click to upload Prompt Image
                                        </p>
                                        <p className="mt-1 text-xs text-gray-400">
                                          Limit 200MB per file • PNG, JPG, JPEG
                                        </p>
                                      </Label>
                                    </div>
                                  </div>
                                  <div>
                                    <Label htmlFor="context-image" className="text-white text-sm mb-1 block">Context Image</Label>
                                    <div
                                      className="border-2 border-dashed border-gray-500 rounded-lg p-4 text-center cursor-pointer hover:border-gray-300 transition-colors"
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                          // Handle context_image upload
                                          setSuccess('Context image dropped successfully!');
                                          setErrors([]);
                                        }
                                      }}
                                    >
                                      <Input
                                        type="file"
                                        id="context-image"
                                        accept=".png,.jpg,.jpeg"
                                        className="hidden"
                                        onChange={(e) => {
                                          // Handle context_image upload
                                          setSuccess('Context image uploaded successfully!');
                                          setErrors([]);
                                        }}
                                      />
                                      <Label htmlFor="context-image" className="cursor-pointer">
                                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                        <p className="mt-1 text-sm text-white">
                                          Drag and drop or click to upload Context Image
                                        </p>
                                        <p className="mt-1 text-xs text-gray-400">
                                          Limit 200MB per file • PNG, JPG, JPEG
                                        </p>
                                      </Label>
                                    </div>
                                  </div>
                                  <div>
                                    <Label htmlFor="response-image" className="text-white text-sm mb-1 block">Response Image</Label>
                                    <div
                                      className="border-2 border-dashed border-gray-500 rounded-lg p-4 text-center cursor-pointer hover:border-gray-300 transition-colors"
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                          // Handle response_image upload
                                          setSuccess('Response image dropped successfully!');
                                          setErrors([]);
                                        }
                                      }}
                                    >
                                      <Input
                                        type="file"
                                        id="response-image"
                                        accept=".png,.jpg,.jpeg"
                                        className="hidden"
                                        onChange={(e) => {
                                          // Handle response_image upload
                                          setSuccess('Response image uploaded successfully!');
                                          setErrors([]);
                                        }}
                                      />
                                      <Label htmlFor="response-image" className="cursor-pointer">
                                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                        <p className="mt-1 text-sm text-white">
                                          Drag and drop or click to upload Response Image
                                        </p>
                                        <p className="mt-1 text-xs text-gray-400">
                                          Limit 200MB per file • PNG, JPG, JPEG
                                        </p>
                                      </Label>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            <Button onClick={handleRunTest} disabled={loading} className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white py-2 text-lg font-semibold">
                              <PlayCircle className="mr-2 h-5 w-5" /> {loading ? 'Running Test...' : 'Run Test'}
                            </Button>
                          </>
                        );
                      } else if (modelType === 'custom') {
                        return (
                          <>
                            <div className="flex flex-col space-y-6">
                              <div>
                                <Label className="text-white text-lg mb-2 block">Upload Prompt JSON</Label>
                                <div
                                  className="border-2 border-dashed border-gray-500 rounded-lg p-6 text-center cursor-pointer hover:border-gray-300 transition-colors"
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                      handlePromptJsonUpload({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
                                    }
                                  }}
                                >
                                  <Input
                                    type="file"
                                    className="hidden"
                                    onChange={handlePromptJsonUpload}
                                    accept=".json"
                                    id="prompt-json-upload"
                                  />
                                  <Label htmlFor="prompt-json-upload" className="cursor-pointer">
                                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                    <p className="mt-2 text-sm text-white">
                                      Drag and drop Prompt JSON here or click to upload
                                    </p>
                                    <p className="mt-1 text-xs text-gray-400">
                                      Limit 200MB per file • JSON
                                    </p>
                                  </Label>
                                </div>
                                {promptJson && (
                                  <p className="mt-2 text-sm text-white">
                                    Prompt JSON uploaded: {promptJson.substring(0, 20)}...
                                  </p>
                                )}
                              </div>

                              <div>
                                <Label className="text-white text-lg mb-2 block">Upload Context TXT</Label>
                                <div
                                  className="border-2 border-dashed border-gray-500 rounded-lg p-6 text-center cursor-pointer hover:border-gray-300 transition-colors"
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                      handleContextTxtUpload({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
                                    }
                                  }}
                                >
                                  <Input
                                    type="file"
                                    className="hidden"
                                    onChange={handleContextTxtUpload}
                                    accept=".txt"
                                    id="context-txt-upload"
                                  />
                                  <Label htmlFor="context-txt-upload" className="cursor-pointer">
                                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                    <p className="mt-2 text-sm text-white">
                                      Drag and drop Context TXT here or click to upload
                                    </p>
                                    <p className="mt-1 text-xs text-gray-400">
                                      Limit 200MB per file • TXT
                                    </p>
                                  </Label>
                                </div>
                                {contextTxt && (
                                  <p className="mt-2 text-sm text-white">
                                    Context TXT uploaded: {contextTxt.substring(0, 20)}...
                                  </p>
                                )}
                              </div>
                            </div>

                            <Button onClick={handleRunTest} disabled={loading} className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white py-2 text-lg font-semibold">
                              <PlayCircle className="mr-2 h-5 w-5" /> {loading ? 'Running Test...' : 'Run Test'}
                            </Button>
                          </>
                        );
                      }
                      return null;
                    })()}
                  </>
                )}
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