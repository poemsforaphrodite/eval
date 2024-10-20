'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { UMAP } from 'umap-js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Menu, BarChart } from "lucide-react";
import { motion } from "framer-motion";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { kmeans } from 'ml-kmeans';
import Sidebar from '@/components/Sidebar';

// Dynamically import Plot component
const DynamicPlot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Function to generate colors based on cluster ID
const getColor = (clusterId: number): string => {
  const colors = [
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7300',
    '#387908',
    '#ff0000',
    '#0000ff',
    '#00ff00',
    '#ff69b4',
    '#8b0000',
    // Add more colors if needed
  ];
  return colors[clusterId % colors.length];
};

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

interface UMAPPoint {
  x: number;
  y: number;
  z: number;
  prompt: string;
  clusterId: number; // New property for cluster identification
  modelName: string; // Added property
  response: string; // Added property
  factors: Evaluation['factors']; // Added property
}

// {{ edit_3 }} Define the capitalize function locally
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

// {{ edit_4 }} Define the Model interface
interface Model {
  model_id: string;
  model_name: string;
  model_type: string;
  // Add other relevant fields if necessary
}

export default function UMAPPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | undefined>('');
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [umapData, setUmapData] = useState<UMAPPoint[]>([]);

  // {{ edit_5 }} Move Hooks inside the component
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelName, setSelectedModelName] = useState<string>('');

  // {{ edit_13 }} Add state for UMAP functionalities
  const allMetrics = [
    'Accuracy',
    'Hallucination',
    'Groundedness',
    'Relevance',
    'Recall',
    'Precision',
    'Consistency',
    'BiasDetection' // {{ edit_FIX_METRIC_KEYS }} Changed from 'Bias Detection' to 'BiasDetection'
  ];
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(allMetrics);
  const [nComponents, setNComponents] = useState<number>(3); // Default to 3D
  const [nNeighbors, setNNeighbors] = useState<number[]>([5]); // Changed from 15 to 5
  const [minDist, setMinDist] = useState<number[]>([0.1]);
  const [numClusters, setNumClusters] = useState<number[]>([3]);
  const [clusterCounts, setClusterCounts] = useState<{ cluster: number; count: number }[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        // {{ edit_7 }} Pass the full model name including type when fetching evaluations
        const fullModelName = `${response.data.models[0].model_name} (${capitalize(response.data.models[0].model_type)})`;
        setSelectedModelName(fullModelName);
        fetchEvaluations(user, fullModelName);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setErrors(['Failed to fetch models.']);
    }
  };

  const fetchEvaluations = async (user: string, modelName: string) => {
    setLoading(true);
    try {
      // Remove the model type from the modelName
      const cleanModelName = modelName.split(' (')[0];
      
      // Ensure proper URL encoding
      const response = await axios.get(`/api/evaluations?username=${encodeURIComponent(user)}&model_name=${encodeURIComponent(cleanModelName)}`);
      setEvaluations(response.data.evaluations);
      performUMAP(response.data.evaluations);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
      setErrors(['Failed to fetch evaluations.']);
    } finally {
      setLoading(false);
    }
  };

  const performUMAP = async (data: Evaluation[]) => {
    // Ensure this function only runs on the client side
    if (typeof window === 'undefined') return;

    // Prepare data based on selected metrics
    const featureVectors = data.map(evalResult => 
      selectedMetrics.map(metric => {
        const factor = evalResult.factors[metric as keyof Evaluation['factors']];
        return factor && typeof factor.score === 'number' ? factor.score : 0;
      })
    );

    // Filter out any rows that contain NaN or undefined values
    const validFeatureVectors = featureVectors.filter(row => row.every(value => !isNaN(value) && value !== undefined));

    // Simple normalization function
    const normalize = (array: number[]) => {
      const min = Math.min(...array);
      const max = Math.max(...array);
      return array.map(value => (max > min ? (value - min) / (max - min) : 0));
    };

    // Normalize each feature
    const X_scaled = validFeatureVectors[0].map((_, colIndex) => 
      normalize(validFeatureVectors.map(row => row[colIndex]))
    ).map((col, rowIndex) => 
      col.map((value, colIndex) => validFeatureVectors[colIndex][rowIndex])
    );

    // Check if we have enough data to proceed
    if (X_scaled.length < (nComponents === 3 ? 3 : 2)) {
      console.error('Not enough valid data for UMAP visualization');
      return;
    }

    // Use UMAP directly, but only on the client side
    const umap = new UMAP({
      nNeighbors: nNeighbors[0],
      minDist: minDist[0],
      nComponents: nComponents,
      random: Math.random
    });

    // Fit the data and transform it
    umap.fit(X_scaled);
    const reducedData = umap.transform(X_scaled);

    // Perform KMeans clustering
    const kmeans_result = kmeans(X_scaled, numClusters[0], { seed: 42 });
    const clusterLabels = kmeans_result.clusters;

    // Assign cluster IDs to data points
    const mappedData: UMAPPoint[] = reducedData.map((point: number[], index: number) => ({
      x: point[0],
      y: nComponents === 3 ? point[1] : 0, // z will be 0 if 2D
      z: nComponents === 3 ? point[2] : 0, // z will be 0 if 2D
      prompt: data[index].prompt,
      clusterId: clusterLabels[index],
      modelName: data[index].modelName, // Added property
      response: data[index].response, // Added property
      factors: data[index].factors, // Added property
    }));

    setUmapData(mappedData);

    // Calculate cluster counts
    const counts: Record<number, number> = {};
    clusterLabels.forEach(label => {
      counts[label as number] = (counts[label as number] || 0) + 1;
    });
    const countsArray = Object.keys(counts).map(key => ({ cluster: parseInt(key), count: counts[parseInt(key)] }));
    setClusterCounts(countsArray);
  };

  // {{ edit_20 }} Handle metric selection
  const handleMetricChange = (metric: string) => {
    if (selectedMetrics.includes(metric)) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  const handleLogout = () => {
    Cookies.remove('username');
    router.push('/login');
  };

  // {{ edit_8 }} Modify handleModelChange to pass the full model name including type
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setSelectedModelName(selected);
    // Pass the full selected value without splitting
    fetchEvaluations(username!, selected);
  };

  // Ensure the component only renders on the client side
  if (typeof window === 'undefined') {
    return null;
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
                <CardTitle className="text-2xl font-bold text-white">Select Model</CardTitle>
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
            
            <Card className="mb-8 bg-gray-800 border-gray-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">UMAP Visualization with Clustering</CardTitle>
              </CardHeader>
              <CardContent>
                {evaluations.length > 2 ? (
                  <>
                    {/* Metrics Selection */}
                    <div className="mb-4">
                      <label className="block text-gray-300 mb-2">Select Metrics to Include in UMAP:</label>
                      <div className="flex flex-wrap">
                        {allMetrics.map(metric => (
                          <div key={metric} className="mr-4">
                            <Checkbox
                              id={`metric-${metric}`}
                              checked={selectedMetrics.includes(metric)}
                              onChange={() => handleMetricChange(metric)}
                            />
                            <label htmlFor={`metric-${metric}`} className="ml-2 text-gray-300">{metric}</label>
                          </div>
                        ))}
                      </div>
                      {selectedMetrics.length < 2 && (
                        <p className="text-yellow-400 mt-2">Please select at least two metrics for UMAP.</p>
                      )}
                    </div>

                    {/* UMAP Dimensions Selection */}
                    <div className="mb-4">
                      <label className="block text-gray-300 mb-2">Select UMAP Dimensions:</label>
                      <select
                        value={nComponents}
                        onChange={(e) => setNComponents(parseInt(e.target.value))}
                        className="w-full bg-gray-700 text-gray-100 border-gray-600 focus:border-purple-400 p-2 rounded"
                      >
                        <option value={2}>2D</option>
                        <option value={3}>3D</option>
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="block text-gray-300 mb-2">Number of Neighbors (n_neighbors): {nNeighbors[0]}</label>
                      <Slider
                        min={2}
                        max={50}
                        step={1}
                        value={nNeighbors}
                        onValueChange={(value) => setNNeighbors(value)}
                        className="w-full"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-gray-300 mb-2">Minimum Distance (min_dist): {minDist[0]}</label>
                      <Slider
                        min={0}
                        max={1}
                        step={0.01}
                        value={minDist}
                        onValueChange={(value) => setMinDist(value)}
                        className="w-full"
                      />
                    </div>

                    {/* Clustering Parameters */}
                    <div className="mb-4">
                      <label className="block text-gray-300 mb-2">Number of Clusters: {numClusters[0]}</label>
                      <Slider
                        min={2}
                        max={10}
                        step={1}
                        value={numClusters}
                        onValueChange={(value) => setNumClusters(value)}
                        className="w-full"
                      />
                    </div>

                    {/* Apply UMAP Button */}
                    <div className="mb-4">
                      <Button
                        onClick={() => performUMAP(evaluations)}
                        disabled={selectedMetrics.length < 2}
                      >
                        Apply UMAP
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-400">Not enough data for UMAP visualization. Please run more evaluations.</p>
                )}
              </CardContent>
            </Card>

            <Card className="mb-8 bg-gray-800 border-gray-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">UMAP Visualization of Evaluation Data</CardTitle>
                <CardDescription className="text-gray-300">
                  This visualization reduces the dimensionality of your evaluation scores to help identify patterns and clusters.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading && <p>Loading UMAP visualization...</p>}
                {errors.length > 0 && errors.map((error, idx) => (
                  <p key={idx} className="text-red-500">{error}</p>
                ))}
                {!loading && umapData.length > 0 && (
                  <DynamicPlot
                    data={Array.from(new Set(umapData.map(point => point.clusterId))).map(clusterId => ({
                      x: umapData.filter(point => point.clusterId === clusterId).map(point => point.x),
                      y: umapData.filter(point => point.clusterId === clusterId).map(point => point.y),
                      z: nComponents === 3 ? umapData.filter(point => point.clusterId === clusterId).map(point => point.z) : undefined,
                      mode: 'markers',
                      type: nComponents === 3 ? 'scatter3d' : 'scatter',
                      name: clusterId === -1 ? 'Noise' : `Cluster ${clusterId + 1}`,
                      marker: {
                        size: 5,
                        color: clusterId === -1 ? '#999999' : getColor(clusterId),
                        opacity: 0.8
                      }
                    }))}
                    layout={{
                      width: 800,
                      height: 600,
                      title: 'UMAP Visualization',
                      titlefont: { color: '#FFFFFF' },
                      legend: { 
                        x: 1,
                        y: 1,
                        font: { color: '#FFFFFF' }
                      },
                      plot_bgcolor: '#1f2937', // Changed to match bg-gray-800
                      paper_bgcolor: '#1f2937', // Changed to match bg-gray-800
                      font: { color: '#FFFFFF' },
                      scene: nComponents === 3 ? {
                        xaxis: { title: 'UMAP 1', color: '#FFFFFF', gridcolor: '#374151', zerolinecolor: '#374151' },
                        yaxis: { title: 'UMAP 2', color: '#FFFFFF', gridcolor: '#374151', zerolinecolor: '#374151' },
                        zaxis: { title: 'UMAP 3', color: '#FFFFFF', gridcolor: '#374151', zerolinecolor: '#374151' }
                      } : {
                        xaxis: { title: 'UMAP 1', color: '#FFFFFF', gridcolor: '#374151', zerolinecolor: '#374151' },
                        yaxis: { title: 'UMAP 2', color: '#FFFFFF', gridcolor: '#374151', zerolinecolor: '#374151' }
                      }
                    }}
                    config={{
                      responsive: true
                    }}
                  />
                )}
                {!loading && umapData.length === 0 && <p>No data available for visualization.</p>}
              </CardContent>
            </Card>

            {/* Cluster Analysis Section */}
            {umapData.length > 0 && (
              <Card className="mb-8 bg-gray-800 border-gray-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-white">Cluster Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Cluster Summary */}
                  <h3 className="text-lg font-semibold text-gray-300 mb-4">Cluster Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-400">Cluster</TableHead>
                        <TableHead className="text-gray-400">Number of Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clusterCounts.map(({ cluster, count }) => (
                        <TableRow key={cluster}>
                          <TableCell className="text-gray-300">Cluster {cluster}</TableCell>
                          <TableCell className="text-gray-300">{count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Cluster Details for All Clusters */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-300 mb-4">Details of All Clusters</h3>
                    {clusterCounts.map(({ cluster }) => (
                      <div key={cluster} className="mb-8">
                        <h4 className="text-md font-semibold text-gray-400 mb-2">Cluster {cluster}</h4>
                        
                        {/* Queries (Prompts) for the Cluster */}
                        <div className="mb-4">
                          <h5 className="text-sm font-semibold text-gray-400 mb-2">Queries in Cluster {cluster}:</h5>
                          <ul className="list-disc pl-5">
                            {umapData
                              .filter(point => point.clusterId === cluster)
                              .map((point, idx) => (
                                <li key={idx} className="text-gray-300 mb-1">
                                  <strong>Prompt:</strong> {point.prompt} <br />
                                  <strong>Response:</strong> {point.response}
                                </li>
                              ))}
                          </ul>
                        </div>

                        {/* Detailed Table */}
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-gray-400">Model</TableHead>
                              <TableHead className="text-gray-400">Prompt</TableHead>
                              <TableHead className="text-gray-400">Response</TableHead>
                              {selectedMetrics.map(metric => (
                                <TableHead key={metric} className="text-gray-400">{metric}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {umapData
                              .filter(point => point.clusterId === cluster)
                              .map((point, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="text-gray-300">{point.modelName}</TableCell>
                                  <TableCell className="text-gray-300">{point.prompt}</TableCell>
                                  <TableCell className="text-gray-300">{point.response}</TableCell>
                                  {selectedMetrics.map(metric => (
                                    <TableCell key={metric} className="text-gray-300">
                                      {point.factors[metric as keyof Evaluation['factors']]?.score ?? 'N/A'}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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
