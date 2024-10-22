'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'; // Updated Recharts components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LogOut, Search, Menu, AlertCircle, LayoutDashboard, TestTube, Settings, Map, TrendingDown } from "lucide-react"
import { motion } from "framer-motion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Key } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import Sidebar from '@/components/Sidebar';

interface Evaluation {
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
  tokenCount?: number; // Add this line if it's not already present
}

// Update the Model interface to match the fetched model format
interface Model {
  model_id: string;
  model_name: string;
  model_type: string;
  // Add other relevant fields if necessary
}

// {{ edit_1 }} Add a helper function to capitalize the first letter
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

// Add this interface for the summary data
interface SummaryData {
  totalQueries: number;
  averageLatency: number;
  averageScores: {
    [key: string]: number;
  };
}

// Add this helper function at the top of your file, outside of the component
const truncateText = (text: string, maxLength: number = 50) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export default function Dashboard() {
  const router = useRouter();
  const [username, setUsername] = useState<string | undefined>('');
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [aggregatedChartData, setAggregatedChartData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelName, setSelectedModelName] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Add this state
  const [lowScoreQueries, setLowScoreQueries] = useState<Evaluation[]>([]);
  const THRESHOLD = 0.6; // You can adjust this threshold as needed
  const tableRef = useRef<HTMLDivElement>(null);
  const [summaryData, setSummaryData] = useState<SummaryData>({
    totalQueries: 0,
    averageLatency: 0,
    averageScores: {},
  });
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const storedUsername = Cookies.get('username');
    if (storedUsername) {
      setUsername(storedUsername);
      fetchModels(storedUsername);
      fetchApiKey(storedUsername);
    } else {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (username && selectedModelName) {
      fetchEvaluations(username);
    }
  }, [username, selectedModelName, timeRange]);

  useEffect(() => {
    const lowScores = evaluations.filter(evaluation => 
      Object.values(evaluation.factors).some(factor => factor.score < THRESHOLD)
    );
    setLowScoreQueries(lowScores);
  }, [evaluations]);

  // Function to aggregate evaluation scores
  const aggregateEvaluationData = (data: Evaluation[]) => {
    const factorSums: { [key: string]: number } = {};
    const factorCounts: { [key: string]: number } = {};
    data.forEach(evalResult => {
      Object.entries(evalResult.factors).forEach(([factor, details]) => {
        if (factorSums[factor]) {
          factorSums[factor] += details.score;
          factorCounts[factor] += 1;
        } else {
          factorSums[factor] = details.score;
          factorCounts[factor] = 1;
        }
      });
    });
    const averagedData = Object.keys(factorSums).map(factor => ({
      factor,
      averageScore: parseFloat((factorSums[factor] / factorCounts[factor]).toFixed(2)),
    }));
    return averagedData;
  };

  const fetchEvaluations = async (user: string) => {
    setLoading(true);
    try {
      const selectedModel = models.find(
        model => `${model.model_name} (${capitalize(model.model_type)})` === selectedModelName
      );
      const modelIdentifier = selectedModel ? selectedModel.model_name : '';
      const response = await fetch(`/api/evaluations?username=${user}&model_name=${encodeURIComponent(modelIdentifier)}&timeRange=${timeRange}`);
      const data = await response.json();

      if (Array.isArray(data.evaluations)) {
        setEvaluations(data.evaluations);
        
        // Calculate summary data
        //test
        const totalLatency = data.evaluations.reduce((sum: number, evaluation) => sum + (evaluation.latency || 0), 0);
        const averageLatency = totalLatency / data.evaluations.length;

        // Calculate average scores for all factors
        const factorSums: { [key: string]: number } = {};
        data.evaluations.forEach((evaluation: Evaluation) => {
          Object.entries(evaluation.factors).forEach(([factor, details]) => {
            if (factorSums[factor]) {
              factorSums[factor] += details.score;
            } else {
              factorSums[factor] = details.score;
            }
          });
        });

        const averageScores: { [key: string]: number } = {};
        Object.entries(factorSums).forEach(([factor, sum]) => {
          averageScores[factor] = parseFloat((sum / data.evaluations.length).toFixed(2));
        });

        setSummaryData({
          totalQueries: data.evaluations.length,
          averageLatency,
          averageScores,
        });

        // Transform evaluations data for LineChart, now including latency
        const transformedData = data.evaluations.map((evalResult: Evaluation, index: number) => ({
          queryNumber: index + 1,
          Accuracy: evalResult.factors.Accuracy.score,
          Hallucination: evalResult.factors.Hallucination.score,
          Groundedness: evalResult.factors.Groundedness.score,
          Relevance: evalResult.factors.Relevance.score,
          Recall: evalResult.factors.Recall.score,
          Precision: evalResult.factors.Precision.score,
          Consistency: evalResult.factors.Consistency.score,
          BiasDetection: evalResult.factors.BiasDetection.score,
          Latency: evalResult.latency || 0, // Use 0 if latency is not available
        }));
        setChartData(transformedData);
      } else {
        setEvaluations([]);
        setChartData([]);
        setErrors(['Invalid evaluations data received from the backend.']);
      }
    } catch (error) {
      console.error('Error fetching evaluations:', error);
      setErrors(['Failed to fetch evaluations.']);
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async (user: string) => {
    try {
      const response = await fetch(`/api/manage-models/get-models?username=${encodeURIComponent(user)}`);
      const data = await response.json();
      if (data.success) {
        setModels(data.models);
        if (data.models.length > 0) {
          const defaultModel = `${data.models[0].model_name} (${capitalize(data.models[0].model_type)})`;
          setSelectedModelName(defaultModel);
        }
      } else {
        setErrors([data.message]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setErrors(['Failed to fetch models.']);
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModelName(e.target.value);
  };

  const handleLogout = () => {
    Cookies.remove('username');
    router.push('/login');
  };

  const scrollToTable = () => {
    tableRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchApiKey = async (user: string) => {
    try {
      const response = await fetch(`/api/get-api-key?username=${encodeURIComponent(user)}`);
      const data = await response.json();
      if (data.success) {
        setApiKey(data.apiKey);
      } else {
        setErrors([data.message]);
      }
    } catch (error) {
      console.error('Error fetching API key:', error);
      setErrors(['Failed to fetch API key.']);
    }
  };

  const handleCloseApiKeyModal = () => {
    setShowApiKey(false);
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

        {/* New: Notification Bar */}
        {lowScoreQueries.length > 0 && (
          <div className="bg-gray-800 border-b border-gray-700 p-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Low Score Queries Detected</AlertTitle>
              <AlertDescription>
                {lowScoreQueries.length} queries have scores below the threshold of {THRESHOLD}.
                <Button 
                  variant="link" 
                  className="text-red-400 hover:text-red-300 p-0 ml-2" 
                  onClick={scrollToTable}
                >
                  View Details
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Remove the Tabs component and keep only the dashboard content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="mb-8 bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-purple-400">Available Models</CardTitle>
                <CardDescription className="text-gray-400">Select a model to view its evaluation results.</CardDescription>
              </CardHeader>
              <CardContent>
                <select
                  value={selectedModelName}
                  onChange={handleModelChange}
                  className="w-full bg-gray-700 text-gray-100 border-gray-600 focus:border-purple-400 p-2 rounded"
                >
                  <option value="">Select a Model</option>
                  {models.map((model) => (
                    <option key={model.model_id} value={`${model.model_name} (${capitalize(model.model_type)})`}>
                      {`${model.model_name} (${capitalize(model.model_type)})`}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          </motion.div>

          {/* Add Summary Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="mb-8 bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-purple-400">Evaluation Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-300">Total Queries</h3>
                    <p className="text-2xl font-bold text-purple-400">{summaryData.totalQueries}</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-300">Avg Latency</h3>
                    <p className="text-2xl font-bold text-purple-400">{summaryData.averageLatency.toFixed(2)} ms</p>
                  </div>
                  {Object.entries(summaryData.averageScores).map(([factor, score]) => (
                    <div key={factor} className="bg-gray-700 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-300">Avg {factor}</h3>
                      <p className="text-2xl font-bold text-purple-400">{score.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="mb-8 bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-purple-400">Your Evaluation Results</CardTitle>
                    <CardDescription className="text-gray-400">Evaluation Scores and Latency per Query</CardDescription>
                  </div>
                  <Select onValueChange={(value: 'hour' | 'day' | 'week' | 'month') => setTimeRange(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">Last Hour</SelectItem>
                      <SelectItem value="day">Last Day</SelectItem>
                      <SelectItem value="week">Last Week</SelectItem>
                      <SelectItem value="month">Last Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="queryNumber" 
                      label={{ value: 'Query Number', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      domain={[0, 1]} 
                      allowDecimals={true} 
                      label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(tick) => tick.toFixed(2)}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight' }}
                    />
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
          </motion.div>

          <motion.div
            ref={tableRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-purple-400">Detailed Evaluation Results</CardTitle>
                <CardDescription className="text-gray-400">
                  Showing {evaluations.length} evaluation results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs uppercase bg-gray-700 text-gray-300">
                      <tr>
                        <th scope="col" className="px-6 py-3">Prompt</th>
                        <th scope="col" className="px-6 py-3">Response (Truncated)</th>
                        <th scope="col" className="px-6 py-3">Accuracy</th>
                        <th scope="col" className="px-6 py-3">Hallucination</th>
                        <th scope="col" className="px-6 py-3">Groundedness</th>
                        <th scope="col" className="px-6 py-3">Relevance</th>
                        <th scope="col" className="px-6 py-3">Recall</th>
                        <th scope="col" className="px-6 py-3">Precision</th>
                        <th scope="col" className="px-6 py-3">Consistency</th>
                        <th scope="col" className="px-6 py-3">Bias Detection</th>
                        <th scope="col" className="px-6 py-3">Latency (ms)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluations.map((evalResult, idx) => (
                        <TableRow 
                          key={idx} 
                          className={`border-b border-gray-700 ${
                            Object.values(evalResult.factors).some(factor => factor.score < THRESHOLD)
                              ? 'bg-red-900 bg-opacity-20'
                              : ''
                          }`}
                        >
                          <TableCell className="font-medium text-gray-300">{truncateText(evalResult.prompt)}</TableCell>
                          <TableCell className="text-gray-300">{truncateText(evalResult.response)}</TableCell>
                          <TableCell className="text-gray-300">{evalResult.factors.Accuracy.score}</TableCell>
                          <TableCell className="text-gray-300">{evalResult.factors.Hallucination.score}</TableCell>
                          <TableCell className="text-gray-300">{evalResult.factors.Groundedness.score}</TableCell>
                          <TableCell className="text-gray-300">{evalResult.factors.Relevance.score}</TableCell>
                          <TableCell className="text-gray-300">{evalResult.factors.Recall.score}</TableCell>
                          <TableCell className="text-gray-300">{evalResult.factors.Precision.score}</TableCell>
                          <TableCell className="text-gray-300">{evalResult.factors.Consistency.score}</TableCell>
                          <TableCell className="text-gray-300">{evalResult.factors.BiasDetection.score}</TableCell>
                          <TableCell className="text-gray-300">{evalResult.latency || 0}</TableCell>
                        </TableRow>
                      ))}
                    </tbody>
                  </table>
                </div>
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

      {/* API Key Modal */}
      <Dialog open={showApiKey} onOpenChange={handleCloseApiKeyModal}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-purple-400 flex items-center">
              <Key className="mr-2" /> Your API Key
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Use this API key to authenticate your requests to the LLM Evaluation System.
            </DialogDescription>
          </DialogHeader>
          <CardContent>
            <div className="bg-gray-800 p-4 rounded-md">
              <code className="text-purple-400 break-all">{apiKey}</code>
            </div>
            <p className="mt-4 text-gray-300 text-sm">
              Keep this key secret. Do not share it or expose it in client-side code.
            </p>
          </CardContent>
        </DialogContent>
      </Dialog>
    </div>
  );
}
