'use client';

import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import axios, { AxiosResponse } from 'axios';
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
import Sidebar from '@/components/Sidebar';

interface Model {
  model_name: string;
  model_type: string;
}

interface EvaluationResult {
  username: string;
  modelName: string;
  prompt: string;
  context: string;
  response: string;
  factors: {
    Accuracy: { score: number; explanation: string };
    Hallucination: { score: number; explanation: string };
    Groundedness: { score: number; explanation: string };
    Relevance: { score: number; explanation: string };
    Recall: { score: number; explanation: string };
    Precision: { score: number; explanation: string };
    Consistency: { score: number; explanation: string };
    BiasDetection: { score: number; explanation: string };
  };
  evaluatedAt: string;
  latency: number;
}

interface ApiResponse {
  results: EvaluationResult[];
}

const chunkText = (text: string, chunkSize: number = 1000): string[] => {
  console.log('Chunking text...');
  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = '';

  for (const word of words) {
    if ((currentChunk + ' ' + word).length <= chunkSize) {
      currentChunk += (currentChunk ? ' ' : '') + word;
    } else {
      chunks.push(currentChunk);
      currentChunk = word;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  console.log(`Text chunked into ${chunks.length} chunks`);
  return chunks;
};

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

  // State variables for Prompt JSON and Context TXT
  const [promptJson, setPromptJson] = useState<string | null>(null);
  const [contextTxt, setContextTxt] = useState<string | null>(null);

  // State variables for audio functionality
  const [promptAudio, setPromptAudio] = useState<File | null>(null);
  const [contextAudio, setContextAudio] = useState<File | null>(null);
  const [responseAudio, setResponseAudio] = useState<File | null>(null);
  const [transcriptions, setTranscriptions] = useState<{
    prompt?: string;
    context?: string;
    response?: string;
  }>({});

  // Updated state variables for image functionality
  const [promptImage, setPromptImage] = useState<File | null>(null);
  const [contextImage, setContextImage] = useState<File | null>(null);
  const [responseImage, setResponseImage] = useState<File | null>(null);

  // Update the results state to handle multiple sets of results
  const [allResults, setAllResults] = useState<EvaluationResult[][]>([]);

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
    if (modelType === 'simple' || modelType === 'custom') {
      setInputType('text');
    }
    setFile(null);
    setContextDataset(null);
    setQuestionsJson(null);
    setSuccess('');
    setErrors([]);
    setAllResults([]); // Reset previous results
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setFile(file);
      setSuccess(`File ${file.name} selected successfully!`);
      setErrors([]);

      // Handle different file types
      if (file.name.endsWith('.json')) {
        handleJsonFile(file);
      } else if (file.name.endsWith('.csv')) {
        handleCsvFile(file);
      } else {
        setErrors(['Unsupported file type. Please upload a JSON or CSV file.']);
      }
    }
  };

  const handleJsonFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        JSON.parse(e.target?.result as string);
        setSuccess('JSON file parsed successfully!');
      } catch (error) {
        setErrors(['Invalid JSON format. Please check your file.']);
      }
    };
    reader.readAsText(file);
  };

  const handleCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      // For simplicity, we're just checking if it's a non-empty string
      // In a real application, you might want to validate the CSV structure
      if (typeof e.target?.result === 'string' && e.target.result.trim().length > 0) {
        setSuccess('CSV file loaded successfully!');
      } else {
        setErrors(['Invalid CSV file. Please check your file.']);
      }
    };
    reader.readAsText(file);
  };

  // Handlers for uploading Prompt JSON
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

  // Handlers for uploading Context TXT
  const handleContextTxtUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = async () => {
        const text = reader.result as string;
        setContextTxt(text);
        setSuccess('Context TXT uploaded successfully!');
        setErrors([]);
        console.log('Context TXT uploaded successfully');
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  const handleRunTest = async () => {
    setErrors([]);
    setSuccess('');
    setLoading(true);

    try {
      if (!selectedModel) {
        setErrors(['Please select a model for testing.']);
        setLoading(false);
        return;
      }

      const modelName = selectedModel.split(' (')[0];
      const modelType = selectedModel.split(' (')[1].replace(')', '').toLowerCase();

      console.log('Starting test run...');
      let response;

      if (inputType === 'text') {
        // Handle text input (simple and custom models)
        if (modelType === 'simple') {
          if (!file) {
            setErrors(['Please upload a test data file (JSON or CSV) for the simple model.']);
            setLoading(false);
            return;
          }

          const fileContent = await readFileContent(file);
          let testData;

          if (file.name.endsWith('.json')) {
            testData = JSON.parse(fileContent);
          } else if (file.name.endsWith('.csv')) {
            testData = parseCSV(fileContent);
          } else {
            throw new Error('Unsupported file type');
          }

          const requestData = {
            username,
            modelName,
            testData,
          };

          console.log('Sending request to simple model API:', requestData);
          response = await axios.post<ApiResponse>('/api/models/simple', requestData);
        } else if (modelType === 'custom' || modelType === 'huggingface') {
          if (!promptJson || !contextTxt) {
            setErrors(['Please upload both Prompt JSON and Context TXT files for the custom model.']);
            setLoading(false);
            return;
          }

          let parsedPrompts;
          try {
            parsedPrompts = JSON.parse(promptJson);
          } catch (error) {
            setErrors(['Invalid Prompt JSON format. Please check your file.']);
            setLoading(false);
            return;
          }

          const requestData = {
            username,
            modelName,
            testData: parsedPrompts.map((prompt: string) => ({
              prompt: { prompt },
              context: contextTxt,
            })),
          };

          console.log('Sending request to custom model API:', requestData);
          response = await axios.post<ApiResponse>('/api/models/custom', requestData);
        } else {
          throw new Error(`Unsupported model type: ${modelType}`);
        }
      } else if (inputType === 'audio') {
        // Handle audio input
        if (!promptAudio || !contextAudio || !responseAudio) {
          setErrors(['Please upload Prompt, Context, and Response audio files for audio testing.']);
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append('username', username);
        formData.append('modelName', modelName);
        formData.append('promptAudio', promptAudio);
        formData.append('contextAudio', contextAudio);
        formData.append('responseAudio', responseAudio);

        console.log('Sending request to audio model API');
        response = await axios.post<ApiResponse>('/api/models/audio', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else if (inputType === 'image') {
        // Handle image input
        // Implement similar logic for image handling if applicable
        setErrors(['Image input handling is not yet implemented.']);
        setLoading(false);
        return;
      } else {
        throw new Error(`Unsupported input type: ${inputType}`);
      }

      console.log('Received response from API:', response.data);

      if (response.data && response.data.results) {
        setAllResults(prevResults => [...prevResults, response.data.results]);
        setSuccess('Evaluation completed. You can now view the results.');
      } else {
        throw new Error('Unexpected response format from server');
      }
    } catch (error: any) {
      console.error('Error running tests:', error.response?.data || error.message);
      setErrors([`An error occurred while running evaluations: ${error.response?.data?.error || error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to read file content
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  // You'll need to implement this function to parse CSV data
  const parseCSV = (csvContent: string) => {
    // Implement CSV parsing logic here
    // Return an array of objects representing the CSV data
    // Example implementation using PapaParse or a similar library
    const rows = csvContent.split('\n').filter(row => row.trim() !== '');
    const headers = rows[0].split(',').map(header => header.trim());

    const data = rows.slice(1).map(row => {
      const values = row.split(',').map(value => value.trim());
      const entry: any = {};
      headers.forEach((header, idx) => {
        entry[header] = values[idx];
      });
      return entry;
    });

    return data;
  };

  const handleLogout = () => {
    Cookies.remove('username');
    router.push('/login');
  };

  const modelOptions = models.map(model => `${model.model_name} (${model.model_type.charAt(0).toUpperCase() + model.model_type.slice(1)})`);

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
                                        <Label className="text-white text-lg mb-2 block">Upload Test Data File</Label>
                                        <div
                                          className="border-2 border-dashed border-gray-500 rounded-lg p-6 text-center cursor-pointer hover:border-gray-300 transition-colors"
                                          onDragOver={(e) => e.preventDefault()}
                                          onDrop={(e) => {
                                            e.preventDefault();
                                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                              handleFileChange({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
                                            }
                                          }}
                                        >
                                          <Input
                                            type="file"
                                            className="hidden"
                                            onChange={handleFileChange}
                                            accept=".json,.csv"
                                            id="file-upload"
                                          />
                                          <Label htmlFor="file-upload" className="cursor-pointer">
                                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                            <p className="mt-2 text-sm text-white">
                                              Drag and drop file here or click to upload
                                            </p>
                                            <p className="mt-1 text-xs text-gray-400">
                                              Limit 200MB per file • JSON, CSV
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
                                  {['prompt', 'context', 'response'].map((type) => (
                                    <div key={type}>
                                      <Label htmlFor={`${type}-audio`} className="text-white text-sm mb-1 block">
                                        {type.charAt(0).toUpperCase() + type.slice(1)} Audio
                                      </Label>
                                      <div
                                        className="border-2 border-dashed border-gray-500 rounded-lg p-4 text-center cursor-pointer hover:border-gray-300 transition-colors"
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                            const file = e.dataTransfer.files[0];
                                            if (type === 'prompt') setPromptAudio(file);
                                            if (type === 'context') setContextAudio(file);
                                            if (type === 'response') setResponseAudio(file);
                                            setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} audio dropped successfully!`);
                                            setErrors([]);
                                          }
                                        }}
                                      >
                                        <Input
                                          type="file"
                                          id={`${type}-audio`}
                                          accept=".mp3,.wav"
                                          className="hidden"
                                          onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                              const file = e.target.files[0];
                                              if (type === 'prompt') setPromptAudio(file);
                                              if (type === 'context') setContextAudio(file);
                                              if (type === 'response') setResponseAudio(file);
                                              setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} audio uploaded successfully!`);
                                              setErrors([]);
                                            }
                                          }}
                                        />
                                        <Label htmlFor={`${type}-audio`} className="cursor-pointer">
                                          <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                          <p className="mt-1 text-sm text-white">
                                            Drag and drop or click to upload {type.charAt(0).toUpperCase() + type.slice(1)} Audio
                                          </p>
                                          <p className="mt-1 text-xs text-gray-400">
                                            Limit 200MB per file • MP3, WAV
                                          </p>
                                        </Label>
                                      </div>
                                      {((type === 'prompt' && promptAudio) || 
                                       (type === 'context' && contextAudio) || 
                                       (type === 'response' && responseAudio)) && (
                                        <p className="mt-2 text-sm text-white">
                                          {type.charAt(0).toUpperCase() + type.slice(1)} audio selected
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {inputType === 'image' && (
                              <div className="space-y-6">
                                <Label className="text-white text-lg mb-2 block">Upload Image Files</Label>
                                <div className="space-y-4">
                                  {['prompt', 'context', 'response'].map((type) => (
                                    <div key={type}>
                                      <Label htmlFor={`${type}-image`} className="text-white text-sm mb-1 block">
                                        {type.charAt(0).toUpperCase() + type.slice(1)} Image
                                      </Label>
                                      <div
                                        className="border-2 border-dashed border-gray-500 rounded-lg p-4 text-center cursor-pointer hover:border-gray-300 transition-colors"
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                            const file = e.dataTransfer.files[0];
                                            if (type === 'prompt') setPromptImage(file);
                                            if (type === 'context') setContextImage(file);
                                            if (type === 'response') setResponseImage(file);
                                            setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} image dropped successfully!`);
                                            setErrors([]);
                                          }
                                        }}
                                      >
                                        <Input
                                          type="file"
                                          id={`${type}-image`}
                                          accept=".png,.jpg,.jpeg"
                                          className="hidden"
                                          onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                              const file = e.target.files[0];
                                              if (type === 'prompt') setPromptImage(file);
                                              if (type === 'context') setContextImage(file);
                                              if (type === 'response') setResponseImage(file);
                                              setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} image uploaded successfully!`);
                                              setErrors([]);
                                            }
                                          }}
                                        />
                                        <Label htmlFor={`${type}-image`} className="cursor-pointer">
                                          <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                          <p className="mt-1 text-sm text-white">
                                            Drag and drop or click to upload {type.charAt(0).toUpperCase() + type.slice(1)} Image
                                          </p>
                                          <p className="mt-1 text-xs text-gray-400">
                                            Limit 200MB per file • PNG, JPG, JPEG
                                          </p>
                                        </Label>
                                      </div>
                                      {((type === 'prompt' && promptImage) || 
                                       (type === 'context' && contextImage) || 
                                       (type === 'response' && responseImage)) && (
                                        <p className="mt-2 text-sm text-white">
                                          {type.charAt(0).toUpperCase() + type.slice(1)} image selected
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <Button onClick={handleRunTest} disabled={loading} className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white py-2 text-lg font-semibold">
                              <PlayCircle className="mr-2 h-5 w-5" /> {loading ? 'Running Test...' : 'Run Test'}
                            </Button>
                          </>
                        );
                      } else if (modelType === 'custom' || modelType === 'huggingface') {
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

                {/* Display Evaluation Results with Individual Latency */}
                {allResults.length > 0 && (
                  <CardContent className="space-y-8">
                    {allResults.map((resultSet, setIdx) => (
                      <Card key={setIdx} className="bg-gray-700 border-gray-600 shadow-md">
                        <CardHeader>
                          <CardTitle className="text-xl font-bold text-white">Evaluation Set {setIdx + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 overflow-y-auto max-h-96">
                          {resultSet.map((result, idx) => (
                            <div key={idx} className="border-b border-gray-600 pb-4">
                              <h3 className="text-lg font-semibold text-white">Prompt: {result.prompt}</h3>
                              <p className="text-gray-300">Response: {result.response}</p>
                              <p className="text-gray-400">Latency: {result.latency} ms</p>
                              <div className="mt-2">
                                {Object.entries(result.factors).map(([factor, evaluation], factorIdx) => (
                                  <div key={factorIdx} className="mt-1">
                                    <span className="text-gray-300 font-medium">{factor}:</span> {evaluation.score} - {evaluation.explanation}
                                  </div>
                                ))}
                              </div>
                              <p className="text-gray-500 text-sm">Evaluated At: {new Date(result.evaluatedAt).toLocaleString()}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
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