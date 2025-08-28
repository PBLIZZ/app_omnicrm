import { spawn } from 'child_process';
import process from 'process';

console.log('🚀 Starting Next.js 15 Foundation...');

// Start Next.js dev server
const nextDev = spawn('npx', ['next', 'dev', '--port', '5000'], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: { ...process.env }
});

nextDev.on('error', (error) => {
  console.error('Failed to start Next.js:', error);
  process.exit(1);
});

nextDev.on('exit', (code, signal) => {
  if (signal) {
    console.log(`Next.js was killed with signal ${signal}`);
  } else {
    console.log(`Next.js exited with code ${code}`);
  }
  process.exit(code || 0);
});

// Handle termination signals
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  nextDev.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  nextDev.kill('SIGTERM');
});