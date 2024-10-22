'use client';

import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PlayCircle, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { Input } from "@/components/ui/input";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

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

// Add this interface for the bulk prompt format
interface BulkPrompt {
  prompt: string;
}

export default function ABTestingPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelA, setSelectedModelA] = useState<string>('');
  const [selectedModelB, setSelectedModelB] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [context, setContext] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resultA, setResultA] = useState<EvaluationResult | null>(null);
  const [resultB, setResultB] = useState<EvaluationResult | null>(null);
  const [bulkPromptsFile, setBulkPromptsFile] = useState<File | null>(null);
  const [useMultiplePrompts, setUseMultiplePrompts] = useState<boolean>(false);
  const [allResultsA, setAllResultsA] = useState<EvaluationResult[]>([]);
  const [allResultsB, setAllResultsB] = useState<EvaluationResult[]>([]);
  const [chartDataA, setChartDataA] = useState<any[]>([]);
  const [chartDataB, setChartDataB] = useState<any[]>([]);

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

  const handleModelSelection = (model: string, isModelA: boolean) => {
    if (isModelA) {
      setSelectedModelA(model);
    } else {
      setSelectedModelB(model);
    }
    setSuccess('');
    setErrors([]);
    setResultA(null);
    setResultB(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBulkPromptsFile(file);
    }
  };

  const handleRunTest = async () => {
    setErrors([]);
    setSuccess('');
    setLoading(true);
    setAllResultsA([]);
    setAllResultsB([]);

    try {
      if (!selectedModelA || !selectedModelB) {
        setErrors(['Please select both models.']);
        setLoading(false);
        return;
      }

      let prompts: string[];
      if (useMultiplePrompts) {
        if (!bulkPromptsFile) {
          setErrors(['Please upload a JSON file with prompts.']);
          setLoading(false);
          return;
        }
        try {
          const fileContent = await bulkPromptsFile.text();
          const parsedPrompts: BulkPrompt[] = JSON.parse(fileContent);
          prompts = parsedPrompts.map(item => item.prompt);
        } catch (error) {
          setErrors(['Invalid JSON format in the uploaded file.']);
          setLoading(false);
          return;
        }
      } else {
        if (!prompt) {
          setErrors(['Please enter a prompt.']);
          setLoading(false);
          return;
        }
        prompts = [prompt];
      }

      const runModelTest = async (model: string, prompts: string[]) => {
        const modelName = model.split(' (')[0];
        const modelType = model.split(' (')[1].replace(')', '').toLowerCase();
        let responseData;

        const testData = prompts.map(p => ({
          prompt: { prompt: p },
          context: context
        }));

        if (modelType === 'simple') {
          responseData = await axios.post('/api/models/simple', {
            testData,
            username,
            modelName,
          });
        } else if (modelType === 'custom' || modelType === 'huggingface') {
          responseData = await axios.post('/api/models/custom', {
            modelName,
            testData,
            username,
          });
        }

        return responseData?.data?.results;
      };

      const [resultsModelA, resultsModelB] = await Promise.all([
        runModelTest(selectedModelA, prompts),
        runModelTest(selectedModelB, prompts)
      ]);

      setAllResultsA(resultsModelA);
      setAllResultsB(resultsModelB);

      // Transform evaluation data for LineCharts
      const transformData = (results: EvaluationResult[]) => results.map((result, index) => ({
        queryNumber: index + 1,
        Accuracy: result.factors.Accuracy.score,
        Hallucination: result.factors.Hallucination.score,
        Groundedness: result.factors.Groundedness.score,
        Relevance: result.factors.Relevance.score,
        Recall: result.factors.Recall.score,
        Precision: result.factors.Precision.score,
        Consistency: result.factors.Consistency.score,
        BiasDetection: result.factors.BiasDetection.score,
        Latency: result.latency,
      }));

      setChartDataA(transformData(resultsModelA));
      setChartDataB(transformData(resultsModelB));

      setSuccess('Evaluation completed. You can now view the results for both models.');
    } catch (error: any) {
      console.error('Error running test:', error.response?.data || error.message);
      setErrors(['An error occurred while running the evaluation. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Cookies.remove('username');
    router.push('/login');
  };

  const modelOptions = models.map(model => `${model.model_name} (${model.model_type.charAt(0).toUpperCase() + model.model_type.slice(1)})`);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      <Sidebar onLogout={handleLogout} />

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-gray-900 shadow-lg lg:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-purple-400">AI AB Testing</h1>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-6 w-6 text-gray-300" />
            </Button>
          </div>
        </header>
        <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="mb-8 bg-gray-800 border-gray-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">AB Testing</CardTitle>
                <CardDescription className="text-gray-300">Compare two AI models with a single prompt or multiple prompts</CardDescription>
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
                {models.length > 0 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="model-select-a" className="text-white text-lg mb-2 block">Select Model A</Label>
                        <Select value={selectedModelA} onValueChange={(value) => handleModelSelection(value, true)}>
                          <SelectTrigger id="model-select-a" className="bg-gray-700 text-white border-gray-600">
                            <SelectValue placeholder="Select model A" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 text-white border-gray-600">
                            {modelOptions.map((option, idx) => (
                              <SelectItem key={idx} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="model-select-b" className="text-white text-lg mb-2 block">Select Model B</Label>
                        <Select value={selectedModelB} onValueChange={(value) => handleModelSelection(value, false)}>
                          <SelectTrigger id="model-select-b" className="bg-gray-700 text-white border-gray-600">
                            <SelectValue placeholder="Select model B" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 text-white border-gray-600">
                            {modelOptions.map((option, idx) => (
                              <SelectItem key={idx} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="multiple-prompts" className="text-white text-lg mb-2 block">
                        <input
                          type="checkbox"
                          id="multiple-prompts"
                          checked={useMultiplePrompts}
                          onChange={(e) => setUseMultiplePrompts(e.target.checked)}
                          className="mr-2"
                        />
                        Use Multiple Prompts
                      </Label>
                    </div>

                    {useMultiplePrompts ? (
                      <div>
                        <Label htmlFor="bulk-prompts-file" className="text-white text-lg mb-2 block">Upload Bulk Prompts JSON File</Label>
                        <Input
                          id="bulk-prompts-file"
                          type="file"
                          accept=".json"
                          onChange={handleFileChange}
                          className="bg-gray-700 text-white border-gray-600"
                        />
                        {bulkPromptsFile && (
                          <p className="text-gray-300 mt-2">File selected: {bulkPromptsFile.name}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="prompt" className="text-white text-lg mb-2 block">Enter Prompt</Label>
                        <Textarea
                          id="prompt"
                          placeholder="Enter your prompt here..."
                          className="bg-gray-700 text-white border-gray-600"
                          value={prompt}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                          rows={4}
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="context" className="text-white text-lg mb-2 block">Enter Context (Optional)</Label>
                      <Textarea
                        id="context"
                        placeholder="Enter context here..."
                        className="bg-gray-700 text-white border-gray-600"
                        value={context}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContext(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <Button onClick={handleRunTest} disabled={loading} className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white py-2 text-lg font-semibold">
                      <PlayCircle className="mr-2 h-5 w-5" /> {loading ? 'Running Test...' : 'Run AB Test'}
                    </Button>
                  </>
                )}

                {(allResultsA.length > 0 || allResultsB.length > 0) && (
                  <div className="mt-8 space-y-8">
                    <h2 className="text-2xl font-bold text-white mb-4">Evaluation Results</h2>
                    
                    {/* Model A Chart */}
                    <Card className="bg-gray-700 border-gray-600 shadow-md">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold text-white">Model A Results</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                          <LineChart data={chartDataA}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="queryNumber" label={{ value: 'Query Number', position: 'insideBottom', offset: -5 }} />
                            <YAxis yAxisId="left" domain={[0, 1]} label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight' }} />
                            <Tooltip />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="Accuracy" stroke="#FF6B6B" strokeWidth={2} />
                            <Line yAxisId="left" type="monotone" dataKey="Hallucination" stroke="#4ECDC4" strokeWidth={2} />
                            <Line yAxisId="left" type="monotone" dataKey="Groundedness" stroke="#FFA500" strokeWidth={2} />
                            <Line yAxisId="left" type="monotone" dataKey="Relevance" stroke="#45B7D1" strokeWidth={2} />
                            <Line yAxisId="left" type="monotone" dataKey="Recall" stroke="#98D8C8" strokeWidth={2} />
                            <Line yAxisId="left" type="monotone" dataKey="Precision" stroke="#F3A712" strokeWidth={2} />
                            <Line yAxisId="left" type="monotone" dataKey="Consistency" stroke="#A364D9" strokeWidth={2} />
                            <Line yAxisId="left" type="monotone" dataKey="BiasDetection" stroke="#FF9FF3" strokeWidth={2} />
                            <Line yAxisId="right" type="monotone" dataKey="Latency" stroke="#82ca9d" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Model B Chart */}
                    <Card className="bg-gray-700 border-gray-600 shadow-md">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold text-white">Model B Results</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                          <LineChart data={chartDataB}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="queryNumber" label={{ value: 'Query Number', position: 'insideBottom', offset: -5 }} />
                            <YAxis yAxisId="left" domain={[0, 1]} label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight' }} />
                            <Tooltip />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="Accuracy" stroke="#FF6B6B" strokeWidth={2} />
                            <Line yAxisId="left" type="monotone" dataKey="Hallucination" stroke="#4ECDC4" strokeWidth={2} />
                            <Line yAxisId="left" type="monotone" dataKey="Groundedness" stroke="#FFA500" strokeWidth={2} />
                            <Line yAxisId="left" type="monotone" dataKey="Relevance" stroke="#45B7D1" strokeWidth={2} />
                            <Line yAxisId="left" type="monotone" dataKey="Recall" stroke="#98D8C8" strokeWidth={2} />
                            <Line yAxisId="left" type="monotone" dataKey="Precision" stroke="#F3A712" strokeWidth={2} />
                            <Line yAxisId="left" type="monotone" dataKey="Consistency" stroke="#A364D9" strokeWidth={2} />
                            <Line yAxisId="left" type="monotone" dataKey="BiasDetection" stroke="#FF9FF3" strokeWidth={2} />
                            <Line yAxisId="right" type="monotone" dataKey="Latency" stroke="#82ca9d" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Detailed Results Table */}
                    {allResultsA.map((resultA, index) => {
                      const resultB = allResultsB[index];
                      return (
                        <div key={index} className="mb-8 p-4 bg-gray-800 rounded-lg">
                          <h3 className="text-xl font-semibold text-white mb-2">Prompt {index + 1}</h3>
                          <p className="text-gray-300 mb-4">{resultA.prompt}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="bg-gray-700 border-gray-600 shadow-md">
                              <CardHeader>
                                <CardTitle className="text-xl font-bold text-white">Model A Result</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="border-b border-gray-600 pb-4">
                                  <h3 className="text-lg font-semibold text-white">Model: {resultA.modelName}</h3>
                                  <p className="text-gray-300">Response: {resultA.response}</p>
                                  <p className="text-gray-400">Latency: {resultA.latency} ms</p>
                                  <div className="mt-2">
                                    {Object.entries(resultA.factors).map(([factor, evaluation], factorIdx) => (
                                      <div key={factorIdx} className="mt-1">
                                        <span className="text-gray-300 font-medium">{factor}:</span> {evaluation.score} - {evaluation.explanation}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="bg-gray-700 border-gray-600 shadow-md">
                              <CardHeader>
                                <CardTitle className="text-xl font-bold text-white">Model B Result</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="border-b border-gray-600 pb-4">
                                  <h3 className="text-lg font-semibold text-white">Model: {resultB.modelName}</h3>
                                  <p className="text-gray-300">Response: {resultB.response}</p>
                                  <p className="text-gray-400">Latency: {resultB.latency} ms</p>
                                  <div className="mt-2">
                                    {Object.entries(resultB.factors).map(([factor, evaluation], factorIdx) => (
                                      <div key={factorIdx} className="mt-1">
                                        <span className="text-gray-300 font-medium">{factor}:</span> {evaluation.score} - {evaluation.explanation}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}
