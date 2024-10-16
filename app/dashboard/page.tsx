'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'; // Updated Recharts components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LogOut, Search, Menu, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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

  useEffect(() => {
    const storedUsername = Cookies.get('username');
    if (storedUsername) {
      setUsername(storedUsername);
      fetchModels(storedUsername);
    } else {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (username && selectedModelName) {
      fetchEvaluations(username);
    }
  }, [username, selectedModelName]);

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
      const modelIdentifier = selectedModel ? `${selectedModel.model_name} (${capitalize(selectedModel.model_type)})` : '';
      const response = await fetch(`/api/evaluations?username=${user}&model_name=${encodeURIComponent(modelIdentifier)}`);
      const data = await response.json();

      if (Array.isArray(data.evaluations)) {
        setEvaluations(data.evaluations);
        // Transform evaluations data for LineChart
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

  if (!username) {
    return null; // or a loading spinner
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex">
      {/* Sidebar */}
      <aside className={`bg-gray-800 w-64 min-h-screen flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static z-30`}>
        <div className="p-4">
          <h1 className="text-2xl font-bold text-purple-400 mb-6">AI Evaluation</h1>
        </div>
        <nav className="flex-1">
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700">
              Dashboard
            </Button>
          </Link>
          <Link href="/prompt-testing">
            <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700">
              Prompt Testing
            </Button>
          </Link>
          <Link href="/manage-models">
            <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700">
              Manage Models
            </Button>
          </Link>
          <Link href="/umap">
            <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700">
              UMAP Visualization
            </Button>
          </Link>
          {/* New: Worst Performing Slice tab */}
          <Link href="/worst-performing-slices">
            <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700">
              Worst Performing Slices
            </Button>
          </Link>
        </nav>
        <div className="p-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700"
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

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* New: Available Models selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="mb-8 bg-gray-800 border-gray-700">
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="mb-8 bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-purple-400">Your Evaluation Results</CardTitle>
                <CardDescription className="text-gray-400">Evaluation Scores per Query</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="queryNumber" 
                      label={{ value: 'Query Number', position: 'insideBottom', offset: -5 }} // Updated X-axis
                    />
                    <YAxis 
                      domain={[0, 1]} 
                      allowDecimals={true} 
                      label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(tick) => tick.toFixed(2)}
                    />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Accuracy" stroke="#FF6B6B" strokeWidth={2} />
                    <Line type="monotone" dataKey="Hallucination" stroke="#4ECDC4" strokeWidth={2} />
                    <Line type="monotone" dataKey="Groundedness" stroke="#FFA500" strokeWidth={2} />
                    <Line type="monotone" dataKey="Relevance" stroke="#45B7D1" strokeWidth={2} />
                    <Line type="monotone" dataKey="Recall" stroke="#98D8C8" strokeWidth={2} />
                    <Line type="monotone" dataKey="Precision" stroke="#F3A712" strokeWidth={2} />
                    <Line type="monotone" dataKey="Consistency" stroke="#A364D9" strokeWidth={2} />
                    <Line type="monotone" dataKey="BiasDetection" stroke="#FF9FF3" strokeWidth={2} />
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
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-purple-400">Queries and Their Evaluation Scores</CardTitle>
                <div className="flex items-center space-x-2">
                  <Input
                    type="text"
                    placeholder="Search queries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm bg-gray-700 text-gray-100 border-gray-600 focus:border-purple-400"
                  />
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-700">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-700">
                      <TableHead className="text-gray-400">Query</TableHead>
                      <TableHead className="text-gray-400">Accuracy</TableHead>
                      <TableHead className="text-gray-400">Hallucination</TableHead>
                      <TableHead className="text-gray-400">Groundedness</TableHead>
                      <TableHead className="text-gray-400">Relevance</TableHead>
                      <TableHead className="text-gray-400">Recall</TableHead>
                      <TableHead className="text-gray-400">Precision</TableHead>
                      <TableHead className="text-gray-400">Consistency</TableHead>
                      <TableHead className="text-gray-400">Bias Detection</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.map((evalResult, idx) => (
                      <TableRow 
                        key={idx} 
                        className={`border-b border-gray-700 ${
                          Object.values(evalResult.factors).some(factor => factor.score < THRESHOLD)
                            ? 'bg-red-900 bg-opacity-20'
                            : ''
                        }`}
                      >
                        <TableCell className="font-medium text-gray-300">{evalResult.prompt}</TableCell>
                        <TableCell className="text-gray-300">{evalResult.factors.Accuracy.score}</TableCell>
                        <TableCell className="text-gray-300">{evalResult.factors.Hallucination.score}</TableCell>
                        <TableCell className="text-gray-300">{evalResult.factors.Groundedness.score}</TableCell>
                        <TableCell className="text-gray-300">{evalResult.factors.Relevance.score}</TableCell>
                        <TableCell className="text-gray-300">{evalResult.factors.Recall.score}</TableCell>
                        <TableCell className="text-gray-300">{evalResult.factors.Precision.score}</TableCell>
                        <TableCell className="text-gray-300">{evalResult.factors.Consistency.score}</TableCell>
                        <TableCell className="text-gray-300">{evalResult.factors.BiasDetection.score}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {evaluations.length === 0 && !loading && (
                  <p className="text-gray-400">No evaluations available for the selected model.</p>
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
