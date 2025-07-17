'use client';

import React from 'react';

export default function PlotsTestPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Test Page - Upload Icon Sizing</h1>
        
        <div className="space-y-8">
          {/* Test 1: Basic SVG with Tailwind classes */}
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-xl mb-4">Test 1: Basic SVG with w-4 h-4</h2>
            <div className="flex items-center justify-center">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
          </div>

          {/* Test 2: SVG with explicit width/height */}
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-xl mb-4">Test 2: SVG with explicit 16px size</h2>
            <div className="flex items-center justify-center">
              <svg
                width="16"
                height="16"
                className="text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
          </div>

          {/* Test 3: SVG with inline styles */}
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-xl mb-4">Test 3: SVG with inline styles (12px)</h2>
            <div className="flex items-center justify-center">
              <svg
                style={{ width: '12px', height: '12px' }}
                className="text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
          </div>

          {/* Test 4: Different size classes for comparison */}
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-xl mb-4">Test 4: Size comparison</h2>
            <div className="flex items-center justify-center space-x-4">
              <div className="text-center">
                <p className="text-sm mb-2">w-3 h-3</p>
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm mb-2">w-4 h-4</p>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm mb-2">w-5 h-5</p>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm mb-2">w-6 h-6</p>
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
            </div>
          </div>

          {/* Test 5: Using the actual FileUploadZone component */}
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-xl mb-4">Test 5: FileUploadZone Component</h2>
            <div className="max-w-md mx-auto">
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                <svg
                  className="w-4 h-4 mx-auto mb-3 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-gray-300">Upload zone simulation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}