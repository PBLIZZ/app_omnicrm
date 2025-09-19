import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Declare Deno global if not available
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

interface ProcessJobsResponse {
  success: boolean;
  message: string;
  processed?: number;
  failed?: number;
}

Deno.serve(async (req: Request) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Get the application URL from environment variables
    const appUrl = Deno.env.get('APP_URL') || 'https://your-app-domain.com';
    const cronSecret = Deno.env.get('CRON_SECRET');

    if (!cronSecret) {
      console.error('CRON_SECRET not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'Configuration error' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Calling job processor endpoint...');

    // Call your existing API endpoint
    const response = await fetch(`${appUrl}/api/cron/process-jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Cron/1.0'
      }
    });

    const responseData: ProcessJobsResponse = await response.json();

    if (!response.ok) {
      console.error('Job processor failed:', responseData);
      return new Response(
        JSON.stringify({ 
          error: 'Job processor failed',
          details: responseData
        }), 
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Job processor completed successfully:', responseData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cron job executed successfully',
        jobResults: responseData
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in cron job execution:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
