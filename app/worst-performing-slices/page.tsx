'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
}

interface Model {
  model_id: string;
  model_name: string;
  model_type: string;
}

interface Slice {
  metric: string;
  averageScore: number;
  evaluations: Evaluation[];
}

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export default function WorstPerformingSlicesPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | undefined>('');
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelName, setSelectedModelName] = useState<string>('');
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [worstSlices, setWorstSlices] = useState<Slice[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [showAllEvaluations, setShowAllEvaluations] = useState(false);

  useEffect(() => {
    const storedUsername = Cookies.get('username');
    if (storedUsername) {
      setUsername(storedUsername);
      fetchModels(storedUsername);
    } else {
      router.push('/login');
    }
  }, [router]);

  const fetchModels = async (user: string) => {
    try {
      const response = await axios.get(`/api/manage-models/get-models?username=${encodeURIComponent(user)}`);
      setModels(response.data.models);
      if (response.data.models.length > 0) {
        const fullModelName = `${response.data.models[0].model_name} (${capitalize(response.data.models[0].model_type)})`;
        setSelectedModelName(fullModelName);
        fetchEvaluations(user, fullModelName);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setErrors(['Failed to fetch models.']);
    }
  };

  const isPartOfCurrentSession = (evaluations: Evaluation[]): Evaluation[] => {
    if (evaluations.length === 0) return [];
    
    const TIME_GAP_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
    const sortedEvals = [...evaluations].sort((a, b) => 
      new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime()
    );
    
    const currentSessionEvals: Evaluation[] = [sortedEvals[0]];
    const latestTime = new Date(sortedEvals[0].evaluatedAt).getTime();
    
    for (let i = 1; i < sortedEvals.length; i++) {
      const evalTime = new Date(sortedEvals[i].evaluatedAt).getTime();
      if (latestTime - evalTime < TIME_GAP_THRESHOLD) {
        currentSessionEvals.push(sortedEvals[i]);
      } else {
        break;
      }
    }
    
    return currentSessionEvals;
  };

  const fetchEvaluations = async (user: string, modelName: string) => {
    setLoading(true);
    try {
      const cleanModelName = modelName.split(' (')[0];
      const response = await axios.get(`/api/evaluations?username=${encodeURIComponent(user)}&model_name=${encodeURIComponent(cleanModelName)}`);
      
      // Filter evaluations based on showAllEvaluations flag
      const relevantEvaluations = showAllEvaluations 
        ? response.data.evaluations
        : isPartOfCurrentSession(response.data.evaluations);

      setEvaluations(relevantEvaluations);
      calculateWorstSlices(relevantEvaluations);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
      setErrors(['Failed to fetch evaluations.']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (username && selectedModelName) {
      fetchEvaluations(username, selectedModelName);
    }
  }, [showAllEvaluations]);

  const calculateWorstSlices = (evaluations: Evaluation[]) => {
    const metrics = ['Accuracy', 'Hallucination', 'Groundedness', 'Relevance', 'Recall', 'Precision', 'Consistency', 'BiasDetection'];
    
    const slices = metrics.map(metric => {
      const relevantEvaluations = evaluations.filter(evaluation => evaluation.factors[metric as keyof Evaluation['factors']]);
      const scores = relevantEvaluations.map(evaluation => evaluation.factors[metric as keyof Evaluation['factors']].score);
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      return {
        metric,
        averageScore,
        evaluations: relevantEvaluations
      };
    });

    // Sort slices by average score (ascending)
    const sortedSlices = slices.sort((a, b) => a.averageScore - b.averageScore);
    setWorstSlices(sortedSlices);
  };

  const handleModelChange = (value: string) => {
    setSelectedModelName(value);
    fetchEvaluations(username!, value);
  };

  const handleLogout = () => {
    Cookies.remove('username');
    router.push('/login');
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
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl font-bold text-white">Select Model</CardTitle>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="showAllEvaluations"
                      checked={showAllEvaluations}
                      onChange={(e) => setShowAllEvaluations(e.target.checked)}
                      className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="showAllEvaluations" className="text-sm text-gray-300">
                      Show All Evaluations
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Select onValueChange={handleModelChange} value={selectedModelName}>
                  <SelectTrigger className="w-full bg-gray-700 text-gray-100 border-gray-600 focus:border-purple-400">
                    <SelectValue placeholder="Select a Model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.model_id} value={`${model.model_name} (${capitalize(model.model_type)})`}>
                        {`${model.model_name} (${capitalize(model.model_type)})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="mb-8 bg-gray-800 border-gray-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Metric Performance</CardTitle>
                <CardDescription className="text-gray-300">
                  This section shows the performance of all metrics for the selected model.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading && <p>Loading metric performance...</p>}
                {errors.length > 0 && errors.map((error, idx) => (
                  <p key={idx} className="text-red-500">{error}</p>
                ))}
                {!loading && worstSlices.length > 0 && (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-gray-400">Metric</TableHead>
                          <TableHead className="text-gray-400">Average Score</TableHead>
                          <TableHead className="text-gray-400">Number of Evaluations</TableHead>
                          <TableHead className="text-gray-400">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {worstSlices.map((slice, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-gray-300">{slice.metric}</TableCell>
                            <TableCell className="text-gray-300">{slice.averageScore.toFixed(2)}</TableCell>
                            <TableCell className="text-gray-300">{slice.evaluations.length}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedMetric(slice.metric)}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {selectedMetric && (
                      <Card className="mt-8 bg-gray-800 border-gray-700 shadow-lg">
                        <CardHeader>
                          <CardTitle className="text-2xl font-bold text-white">{selectedMetric} - Detailed View</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-gray-400">Prompt</TableHead>
                                <TableHead className="text-gray-400">Response</TableHead>
                                <TableHead className="text-gray-400">Score</TableHead>
                                <TableHead className="text-gray-400">Explanation</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {worstSlices.find(slice => slice.metric === selectedMetric)?.evaluations
                                .sort((a, b) => a.factors[selectedMetric as keyof Evaluation['factors']].score - b.factors[selectedMetric as keyof Evaluation['factors']].score)
                                .map((evaluation, evalIndex) => (
                                  <TableRow key={evalIndex}>
                                    <TableCell className="text-gray-300">{evaluation.prompt}</TableCell>
                                    <TableCell className="text-gray-300">{evaluation.response}</TableCell>
                                    <TableCell className="text-gray-300">
                                      {evaluation.factors[selectedMetric as keyof Evaluation['factors']].score.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-gray-300">
                                      {evaluation.factors[selectedMetric as keyof Evaluation['factors']].explanation}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
                {!loading && worstSlices.length === 0 && <p>No data available for metric performance.</p>}
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
