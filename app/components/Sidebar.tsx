import React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { 
  LogOut, 
  LayoutDashboard, 
  TestTube, 
  Settings, 
  Map, 
  TrendingDown, 
  Key, 
  FileText, 
  Database,
  Layers,
  Activity,
  GitBranch,
  UserCheck,
  Beaker, // Changed from Flask to Beaker
  MessageSquare,
  Archive,
  Database as DatasetIcon,
  Box
} from "lucide-react";

interface SidebarProps {
  onLogout: () => void;
}

export default function Sidebar({ onLogout }: SidebarProps) {
  return (
    <aside className="bg-gray-900 w-72 min-h-screen flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 fixed lg:static z-30">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-purple-400 mb-6">AI Evaluation</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <Link href="/dashboard" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <LayoutDashboard className="w-5 h-5 mr-2" /> Dashboard
          </Button>
        </Link>
        <Link href="/prompt-testing" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <TestTube className="w-5 h-5 mr-2" /> Prompt Testing
          </Button>
        </Link>
        <Link href="/manage-models" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <Settings className="w-5 h-5 mr-2" /> Manage Models
          </Button>
        </Link>
        <Link href="/umap" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <Map className="w-5 h-5 mr-2" /> UMAP Visualization
          </Button>
        </Link>
        <Link href="/worst-performing-slices" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <TrendingDown className="w-5 h-5 mr-2" /> Worst Performing Slices
          </Button>
        </Link>
        <Link href="/api-key" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <Key className="w-5 h-5 mr-2" /> API Key
          </Button>
        </Link>
        <Link href="/playground" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <Layers className="w-5 h-5 mr-2" /> Playground
          </Button>
        </Link>
        <Link href="/api-reference" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <FileText className="w-5 h-5 mr-2" /> API Reference
          </Button>
        </Link>
        <Link href="/test-sets" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <Database className="w-5 h-5 mr-2" /> Test Sets
          </Button>
        </Link>
        <Link href="/logs" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <Activity className="w-5 h-5 mr-2" /> Logs
          </Button>
        </Link>
        <Link href="/threads" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <GitBranch className="w-5 h-5 mr-2" /> Threads
          </Button>
        </Link>
        <Link href="/evaluators" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <UserCheck className="w-5 h-5 mr-2" /> Evaluators
          </Button>
        </Link>
        <Link href="/lab" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <Beaker className="w-5 h-5 mr-2" /> Lab
          </Button>
        </Link>
        <Link href="/prompts" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <MessageSquare className="w-5 h-5 mr-2" /> Prompts
          </Button>
        </Link>
        <Link href="/caches" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <Archive className="w-5 h-5 mr-2" /> Caches
          </Button>
        </Link>
        <Link href="/datasets" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <DatasetIcon className="w-5 h-5 mr-2" /> Datasets
          </Button>
        </Link>
        <Link href="/models" className="block">
          <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200">
            <Box className="w-5 h-5 mr-2" /> Models
          </Button>
        </Link>
      </nav>
      <div className="p-4">
        <Button
          variant="outline"
          className="w-full justify-start text-gray-300 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-purple-400 py-4 text-base transition-colors duration-200"
          onClick={onLogout}
        >
          <LogOut className="w-5 h-5 mr-2" /> Logout
        </Button>
      </div>
    </aside>
  );
}
