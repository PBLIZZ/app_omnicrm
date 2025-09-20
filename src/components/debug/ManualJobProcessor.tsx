'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Database, Calendar, Mail, Zap, Terminal } from 'lucide-react';
import { fetchGet, fetchPost } from '@/lib/api';

interface JobResult {
  success: boolean;
  message: string;
  processed: number | undefined;
  errors: string[] | undefined;
}

interface JobStatus {
  id: string;
  kind: string;
  status: "queued" | "processing" | "done" | "error";
  batchId?: string;
  createdAt: string;
  message?: string;
}

export function ManualJobProcessor(): React.JSX.Element | null {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, JobResult>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [jobQueue, setJobQueue] = useState<JobStatus[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const fetchJobStatus = async () => {
    try {
      const data = await fetchGet<{ jobs: JobStatus[] }>('/api/jobs/status');
      setJobQueue(data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch job status:', error);
    }
  };

  useEffect(() => {
    void fetchJobStatus(); // Initial fetch - explicit void for fire-and-forget

    if (isPolling) {
      const interval = setInterval(() => void fetchJobStatus(), 2000); // Poll every 2 seconds
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isPolling]);

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔄';
    setLogs(prev => [...prev, `[${timestamp}] ${prefix} ${message}`]);
  };

  const processJob = async (jobType: string, endpoint: string) => {
    setIsProcessing(jobType);
    addLog(`Starting ${jobType} processing...`);

    try {
      const result = await fetchPost<{
        processed?: number;
        errors?: string[];
        message?: string;
      }>(endpoint, {});

      addLog(`${jobType} completed successfully. Processed: ${result.processed ?? 0}`, 'success');
      if (result.errors?.length && result.errors.length > 0) {
        result.errors.forEach((error: string) => {
          addLog(`Error: ${error}`, 'error');
        });
      }

      setResults(prev => ({
        ...prev,
        [jobType]: {
          success: true,
          message: result.message || 'Success',
          processed: result.processed ?? undefined,
          errors: result.errors ?? undefined,
        }
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`${jobType} failed with exception: ${errorMsg}`, 'error');

      setResults(prev => ({
        ...prev,
        [jobType]: {
          success: false,
          message: errorMsg,
          processed: undefined,
          errors: undefined,
        }
      }));
    } finally {
      setIsProcessing(null);
    }
  };

  const JobButton = ({
    jobType,
    endpoint,
    icon: Icon,
    label,
    description
  }: {
    jobType: string;
    endpoint: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    description: string;
  }) => {
    const result = results[jobType];
    const isLoading = isProcessing === jobType;

    return (
      <div className="space-y-2">
        <Button
          onClick={() => void processJob(jobType, endpoint)}
          disabled={isLoading}
          className="w-full bg-black border-2 border-green-400 hover:border-orange-400 hover:bg-gray-800 text-green-400 hover:text-orange-400 font-mono text-sm font-bold tracking-wide transition-all duration-300 shadow-lg shadow-green-400/20 hover:shadow-orange-400/30"
          size="lg"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin text-orange-400" />
          ) : (
            <Icon className="w-4 h-4 mr-2" />
          )}
          {label}
        </Button>
        
        <div className="text-xs font-mono text-green-300 px-2 font-bold">
          <span className="text-orange-300">{'>'}</span> {description}
        </div>

        {result && (
          <div className={`p-3 rounded border-2 font-mono text-xs font-bold ${
            result.success 
              ? 'bg-black border-green-400 text-green-400 shadow-lg shadow-green-400/20' 
              : 'bg-black border-red-400 text-red-400 shadow-lg shadow-red-400/20'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant={result.success ? 'default' : 'destructive'} 
                className={`text-xs font-bold ${
                  result.success 
                    ? 'bg-green-400 text-black border-green-400' 
                    : 'bg-red-400 text-black border-red-400'
                }`}
              >
                {result.success ? 'SUCCESS' : 'ERROR'}
              </Badge>
              {result.processed !== undefined && (
                <span className="text-orange-400">Processed: {result.processed}</span>
              )}
            </div>
            <div className="text-white">{result.message}</div>
            {result.errors?.length && result.errors.length > 0 && (
              <div className="mt-2 text-xs text-red-300">
                <span className="text-red-400">Errors:</span> {result.errors.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-4 border-orange-500 shadow-lg shadow-orange-500/50 bg-gray-900 relative overflow-hidden">
      {/* Neon glow effects */}
      <div className="absolute inset-0 border-2 border-green-400 animate-pulse opacity-30 rounded-lg"></div>
      <div className="absolute inset-1 border border-orange-400 animate-pulse opacity-50 rounded-lg"></div>
      
      <CardHeader className="bg-black border-b-2 border-green-400 text-center relative z-10">
        <CardTitle className="font-mono text-xl flex items-center justify-center gap-3 text-green-400">
          <Zap className="w-6 h-6 animate-pulse text-orange-400" />
          <span className="text-orange-400">🚨</span>
          <span className="text-green-400 font-bold tracking-wider">DEV DEBUG: Manual Job Processor</span>
          <span className="text-orange-400">🚨</span>
          <Zap className="w-6 h-6 animate-pulse text-orange-400" />
        </CardTitle>
        <div className="text-green-300 text-sm font-mono font-bold tracking-wide mt-2">
          <span className="text-orange-300">[</span>
          DEVELOPMENT ONLY - Manual data transformation controls
          <span className="text-orange-300">]</span>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-4 bg-gray-900 relative z-10">
        <div className="grid gap-4 md:grid-cols-2">
          <JobButton
            jobType="raw-events-sync"
            endpoint="/api/jobs/process/raw-events"
            icon={Mail}
            label="PROCESS RAW_EVENTS → INTERACTIONS"
            description="Transform Gmail raw_events into structured interactions"
          />
          
          <JobButton
            jobType="calendar-events-sync"
            endpoint="/api/jobs/process/calendar-events"
            icon={Calendar}
            label="PROCESS CALENDAR_EVENTS"
            description="Transform Google Calendar events into interactions"
          />
          
          <JobButton
            jobType="normalize-all"
            endpoint="/api/jobs/process/normalize"
            icon={Database}
            label="NORMALIZE ALL DATA"
            description="Run normalization on all pending data"
          />
          
          <JobButton
            jobType="full-sync"
            endpoint="/api/jobs/process"
            icon={Play}
            label="PROCESS ALL JOBS"
            description="Run all pending jobs in queue"
          />
        </div>

        {/* Job Queue Status */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-green-400 font-mono font-bold text-sm">JOB QUEUE STATUS</h3>
            <Button
              onClick={() => setIsPolling(!isPolling)}
              size="sm"
              className={`font-mono text-xs ${
                isPolling 
                  ? 'bg-orange-500 border-orange-400 text-black hover:bg-orange-600' 
                  : 'bg-black border-green-400 text-green-400 hover:bg-gray-800'
              }`}
            >
              {isPolling ? 'STOP POLLING' : 'START POLLING'}
            </Button>
          </div>
          
          <div className="bg-black border-2 border-green-400/50 rounded p-3 max-h-48 overflow-y-auto">
            {jobQueue.length === 0 ? (
              <div className="text-green-400/50 font-mono text-xs italic">No jobs in queue</div>
            ) : (
              <div className="space-y-2">
                {jobQueue.slice(0, 10).map((job) => (
                  <div key={job.id} className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`text-xs font-mono ${
                          job.status === 'queued' ? 'bg-yellow-500 text-black' :
                          job.status === 'processing' ? 'bg-blue-500 text-white' :
                          job.status === 'done' ? 'bg-green-500 text-black' :
                          'bg-red-500 text-white'
                        }`}
                      >
                        {job.status.toUpperCase()}
                      </Badge>
                      <span className="text-green-300">{job.kind}</span>
                    </div>
                    <div className="text-green-400/70 text-xs">
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                {jobQueue.length > 10 && (
                  <div className="text-green-400/50 text-xs italic">
                    ... and {jobQueue.length - 10} more jobs
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Debug Console */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-green-400 font-mono font-bold text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              DEBUG CONSOLE
            </h3>
            <Button
              onClick={() => setLogs([])}
              size="sm"
              className="bg-black border-orange-400 text-orange-400 hover:bg-gray-800 font-mono text-xs"
            >
              CLEAR
            </Button>
          </div>
          
          <div className="bg-gray-900 border-2 border-green-400/50 rounded p-3 h-48 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-green-400/50 italic">Waiting for job execution...</div>
            ) : (
              logs.map((log, index) => (
                <div 
                  key={index} 
                  className={`mb-1 ${
                    log.includes('❌') ? 'text-red-400' : 
                    log.includes('✅') ? 'text-green-400' : 
                    'text-green-300'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        <div className="mt-6 p-4 bg-black text-green-400 rounded border-2 border-green-400 font-mono text-xs shadow-lg shadow-green-400/20 relative">
          <div className="absolute inset-0 border border-orange-400 rounded animate-pulse opacity-30"></div>
          <div className="relative z-10">
            <div className="text-orange-400 mb-2 font-bold">$ DEBUG_MODE=true</div>
            <div className="text-green-300">→ Manual job processing enabled</div>
            <div className="text-green-300">→ Use these controls to transform your data</div>
            <div className="text-green-300">→ Check database tables after processing</div>
            <div className="text-orange-400 mt-2 font-bold">⚠ This component only appears in development</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
