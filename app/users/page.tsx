'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import Sidebar from '@/components/Sidebar';

interface User {
  _id: string;
  username: string;
  isAdmin: boolean;
}

interface Model {
  model_id: string;
  model_name: string;
  model_type: string;
}

interface Evaluation {
  _id: string;
  username: string;
  modelName: string;
  prompt: string;
  response: string;
  factors: {
    [key: string]: { score: number; explanation: string };
  };
  evaluatedAt: string;
}

function EvaluationsTable({ evaluations }: { evaluations: Evaluation[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-800">
          <TableHead className="text-purple-300 font-bold">Model</TableHead>
          <TableHead className="text-purple-300 font-bold">Prompt</TableHead>
          <TableHead className="text-purple-300 font-bold">Response</TableHead>
          <TableHead className="text-purple-300 font-bold">Scores</TableHead>
          <TableHead className="text-purple-300 font-bold">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {evaluations.map((evaluation, index) => (
          <TableRow key={evaluation._id} className={index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-850'}>
            <TableCell className="font-medium text-gray-200">{evaluation.modelName}</TableCell>
            <TableCell className="text-gray-300">{evaluation.prompt.substring(0, 50)}...</TableCell>
            <TableCell className="text-gray-300">{evaluation.response.substring(0, 50)}...</TableCell>
            <TableCell className="text-gray-300">
              {Object.entries(evaluation.factors).map(([factor, { score }]) => (
                <div key={factor} className="flex justify-between">
                  <span>{factor}:</span>
                  <span className={`font-bold ${score >= 0.7 ? 'text-green-400' : score >= 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {score.toFixed(2)}
                  </span>
                </div>
              ))}
            </TableCell>
            <TableCell className="text-gray-300">{new Date(evaluation.evaluatedAt).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const router = useRouter();
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);

  // Define fetchUsers using useCallback to ensure it's accessible throughout the component
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users);
      setLoading(false);
      setIsDatabaseReady(true);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedUsername = Cookies.get('username');
    console.log('Stored username:', storedUsername); // Debug log

    if (storedUsername) {
      checkAdminStatus(storedUsername);
    } else {
      router.push('/login');
    }
  }, [router, fetchUsers]);

  useEffect(() => {
    if (!isAdmin) return;

    fetchUsers();
  }, [isAdmin, fetchUsers]);

  const checkAdminStatus = async (username: string) => {
    try {
      const response = await fetch(`/api/check-admin?username=${encodeURIComponent(username)}`);
      if (!response.ok) {
        throw new Error('Failed to check admin status');
      }
      
      const data = await response.json();
      console.log('Admin check response:', data); // Debug log
      
      setIsAdmin(data.isAdmin);
      if (data.isAdmin) {
        setLoading(false);
      } else {
        setError('You do not have permission to view this page.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Admin check error:', err); // Debug log
      setError('Failed to check admin status. Please try again.');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Cookies.remove('username');
    router.push('/login');
  };

  const handleViewModels = async (username: string) => {
    setSelectedUser(username);
    setSelectedModel(null);
    setEvaluations([]);
    try {
      const response = await fetch(`/api/manage-models/get-models?username=${encodeURIComponent(username)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const data = await response.json();
      setModels(data.models);
    } catch (err) {
      setError('Failed to load models. Please try again.');
    }
  };

  const handleModelSelect = async (modelName: string) => {
    setSelectedModel(modelName);
    if (selectedUser) {
      try {
        const response = await fetch(`/api/evaluations?username=${encodeURIComponent(selectedUser)}&model_name=${encodeURIComponent(modelName)}&timeRange=day`);
        if (!response.ok) {
          throw new Error('Failed to fetch evaluations');
        }
        const data = await response.json();
        setEvaluations(data.evaluations);
      } catch (err) {
        setError('Failed to load evaluations. Please try again.');
      }
    }
  };

  const handleAddUser = async (username: string, password: string, isAdmin: boolean) => {
    try {
      const response = await fetch('/api/admin/users/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, isAdmin }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add user');
      }

      await fetchUsers(); // Refresh the user list
    } catch (err) {
      setError('Failed to add user. Please try again.');
    }
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddUser(newUsername, newPassword, newIsAdmin);
    setNewUsername('');
    setNewPassword('');
    setNewIsAdmin(false);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      await fetchUsers(); // Refresh the user list
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user. Please try again.');
    }
  };

  if (loading) return <div className="text-center mt-8 text-gray-300">Loading...</div>;
  if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <Sidebar onLogout={handleLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-900 shadow-lg w-full">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold text-purple-400">User Management</h1>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-950 p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <Card className="bg-gray-900 border-gray-800 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-purple-400">Add New User</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddUserSubmit} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-gray-200"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-gray-200"
                    required
                  />
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newIsAdmin}
                      onChange={(e) => setNewIsAdmin(e.target.checked)}
                      className="mr-2"
                    />
                    <label className="text-gray-200">Admin</label>
                  </div>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                    Add User
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-purple-400">Users</CardTitle>
                <CardDescription className="text-gray-400">View system users and their models</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-800">
                        <TableHead className="text-purple-300 font-bold">Username</TableHead>
                        <TableHead className="text-purple-300 font-bold">Admin</TableHead>
                        <TableHead className="text-purple-300 font-bold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user._id} className="bg-gray-900">
                          <TableCell className="font-medium text-gray-200">{user.username}</TableCell>
                          <TableCell className="text-gray-300">{user.isAdmin ? 'Yes' : 'No'}</TableCell>
                          <TableCell>
                            <Button
                              onClick={() => handleViewModels(user.username)}
                              variant="outline"
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              View Models
                            </Button>
                            <Button
                              onClick={() => handleDeleteUser(user._id)}
                              variant="outline"
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white ml-2"
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {selectedUser && (
              <Card className="bg-gray-900 border-gray-800 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-purple-400">Models for {selectedUser}</CardTitle>
                  <CardDescription className="text-gray-400">Select a model to view its evaluations</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select onValueChange={handleModelSelect}>
                    <SelectTrigger className="w-full max-w-xs bg-gray-800 text-gray-200 border-gray-700">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-gray-200 border-gray-700">
                      {models.map((model) => (
                        <SelectItem key={model.model_id} value={model.model_name} className="hover:bg-gray-700">
                          {model.model_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {selectedModel && (
              <Card className="bg-gray-900 border-gray-800 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-purple-400">Evaluations for {selectedModel}</CardTitle>
                  <CardDescription className="text-gray-400">Recent evaluation results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <EvaluationsTable evaluations={evaluations} />
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
