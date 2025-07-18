'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PlotsPage() {
  return (
    <div className="min-h-screen">
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              BWR Plots
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Publication-Ready Chart Generator
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create professional charts with exact BWR visual standards. 
              This tool is currently being updated to use the new consolidated plotting system.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <Card className="min-h-[400px]">
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Tool Under Maintenance</h2>
              <p className="text-muted-foreground mb-6">
                We&apos;re currently updating this tool to use our new consolidated BWR plotting system.
                In the meantime, you can test the functionality at the development page.
              </p>
              <Button 
                onClick={() => window.location.href = '/dev/plot_tests'}
                className="mr-4"
              >
                View Development Version
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'}
              >
                Return Home
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}