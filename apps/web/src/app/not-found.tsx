'use client';

import Link from 'next/link';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-100 p-4">
      <div className="flex flex-col items-center max-w-md text-center space-y-6">
        <div className="p-4 bg-gray-800 rounded-full border border-gray-700 shadow-xl">
          <AlertCircle className="w-16 h-16 text-yellow-500" />
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          404 - Page Not Found
        </h1>
        
        <p className="text-lg text-gray-400">
          Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="pt-4">
          <Link 
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl w-full sm:w-auto space-x-2"
          >
            <Home className="w-5 h-5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
