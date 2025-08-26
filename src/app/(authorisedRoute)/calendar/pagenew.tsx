'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, RefreshCw, Link, CheckCircle, AlertCircle, Brain, Search, Zap } from 'lucide-react';
import { format } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  eventType?: string;
  businessCategory?: string;
  attendees?: any[];
}

interface CalendarStats {
  upcomingEventsCount: number;
  upcomingEvents: CalendarEvent[];
  lastSync: string | null;
}

export default function CalendarPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkCalendarStatus();
  }, []);

  const checkCalendarStatus = async () => {
    try {
      const response = await fetch('/api/calendar/sync');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setIsConnected(true);
      } else if (response.status === 500) {
        // Calendar not connected yet
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error checking calendar status:', error);
    }
  };

  const connectCalendar = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      console.log('Fetching OAuth URL...');
      const response = await fetch('/api/calendar/oauth');
      console.log('OAuth response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('OAuth data:', data);
        
        if (data.authUrl) {
          console.log('Opening auth window with URL:', data.authUrl);
          // Open OAuth window
          const authWindow = window.open(
            data.authUrl,
            'googleCalendarAuth',
            'width=500,height=600,scrollbars=yes,resizable=yes'
          );
          
          if (!authWindow) {
            setError('Popup blocked! Please allow popups for this site and try again.');
            setIsConnecting(false);
            return;
          }
          
          console.log('Auth window opened:', authWindow);
        } else {
          setError('No authorization URL received');
          setIsConnecting(false);
          return;
        }

        // Listen for OAuth completion via postMessage
        const handleMessage = async (event: MessageEvent) => {
          console.log('Received message:', event.data);
          if (event.data.type === 'GOOGLE_CALENDAR_CODE') {
            console.log('Processing authorization code:', event.data.code);
            // Process the authorization code
            try {
              const response = await fetch('/api/calendar/oauth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: event.data.code })
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.success) {
                  setIsConnecting(false);
                  checkCalendarStatus();
                } else {
                  setError(data.message || 'Authorization failed');
                  setIsConnecting(false);
                }
              } else {
                setError('Failed to complete authorization');
                setIsConnecting(false);
              }
            } catch (error) {
              setError('Network error during authorization');
              setIsConnecting(false);
            }
            window.removeEventListener('message', handleMessage);
          } else if (event.data.type === 'GOOGLE_CALENDAR_ERROR') {
            setError(event.data.error || 'Authorization failed');
            setIsConnecting(false);
            window.removeEventListener('message', handleMessage);
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        // Poll localStorage for OAuth result (primary method for Replit)
        const pollAuth = setInterval(() => {
          const result = localStorage.getItem('google_oauth_result');
          if (result) {
            try {
              const data = JSON.parse(result);
              console.log('Main window: Found OAuth result in localStorage:', data);
              localStorage.removeItem('google_oauth_result');
              clearInterval(pollAuth);
              
              if (data.type === 'GOOGLE_CALENDAR_CODE') {
                console.log('Main window: Processing authorization code from localStorage');
                handleMessage({ data });
              }
            } catch (e) {
              console.error('Main window: Error parsing OAuth result:', e);
            }
          } else {
            console.log('Main window: Polling localStorage... no result yet');
          }
        }, 500);
        
        // Fallback: check if window is closed
        const checkClosed = setInterval(() => {
          try {
            if (authWindow?.closed) {
              clearInterval(checkClosed);
              clearInterval(pollAuth);
              setIsConnecting(false);
              window.removeEventListener('message', handleMessage);
            }
          } catch (e) {
            clearInterval(checkClosed);
            clearInterval(pollAuth);
            setIsConnecting(false);
            window.removeEventListener('message', handleMessage);
          }
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to start OAuth flow');
        setIsConnecting(false);
      }
    } catch (error) {
      setError('Network error connecting to calendar');
      setIsConnecting(false);
    }
  };

  const syncCalendar = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/calendar/sync', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        await checkCalendarStatus(); // Refresh stats
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Sync failed');
      }
    } catch (error) {
      setError('Network error during sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const generateEmbeddings = async () => {
    setIsEmbedding(true);
    setError(null);

    try {
      const response = await fetch('/api/calendar/embed', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        alert(`Successfully generated embeddings for ${data.processedEvents} events!`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate embeddings');
      }
    } catch (error) {
      setError('Network error during embedding generation');
    } finally {
      setIsEmbedding(false);
    }
  };

  const searchEvents = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await fetch('/api/calendar/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 5 })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const loadInsights = async () => {
    try {
      const response = await fetch('/api/calendar/insights');
      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights);
      }
    } catch (error) {
      console.error('Insights error:', error);
    }
  };

  const getEventTypeColor = (eventType?: string) => {
    switch (eventType) {
      case 'class': return 'bg-blue-100 text-blue-800';
      case 'workshop': return 'bg-purple-100 text-purple-800';
      case 'consultation': return 'bg-green-100 text-green-800';
      case 'appointment': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar Integration</h1>
          <p className="text-muted-foreground">
            Sync your Google Calendar to track classes, appointments, and build client timelines
          </p>
        </div>
        {isConnected && (
          <div className="flex gap-2">
            <Button onClick={syncCalendar} disabled={isSyncing} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            <Button onClick={generateEmbeddings} disabled={isEmbedding} variant="outline">
              <Brain className={`h-4 w-4 mr-2 ${isEmbedding ? 'animate-spin' : ''}`} />
              {isEmbedding ? 'Embedding...' : 'Generate AI Embeddings'}
            </Button>
            <Button onClick={loadInsights} variant="outline">
              <Zap className="h-4 w-4 mr-2" />
              Insights
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {!isConnected ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Connect Your Google Calendar</CardTitle>
            <CardDescription>
              Sync your calendar to automatically track client attendance, build timelines, and gain insights into your wellness practice.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  <Users className="h-8 w-8 text-blue-600 mb-2" />
                  <h3 className="font-medium">Track Attendance</h3>
                  <p className="text-muted-foreground text-center">Match calendar events with attendance data</p>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  <Clock className="h-8 w-8 text-green-600 mb-2" />
                  <h3 className="font-medium">Build Timelines</h3>
                  <p className="text-muted-foreground text-center">Automatically update client history</p>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  <Calendar className="h-8 w-8 text-purple-600 mb-2" />
                  <h3 className="font-medium">AI Insights</h3>
                  <p className="text-muted-foreground text-center">Get smart recommendations for your practice</p>
                </div>
              </div>
              <Button onClick={connectCalendar} disabled={isConnecting} size="lg">
                <Link className="h-4 w-4 mr-2" />
                {isConnecting ? 'Connecting...' : 'Connect Google Calendar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Connected
              </CardTitle>
              <CardDescription>Your Google Calendar is synced</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Upcoming Events</span>
                  <Badge variant="secondary">{stats?.upcomingEventsCount || 0}</Badge>
                </div>
                {stats?.lastSync && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Sync</span>
                    <span className="text-sm">{format(new Date(stats.lastSync), 'MMM d, HH:mm')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Your next calendar events with business intelligence</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.upcomingEvents?.length ? (
                <div className="space-y-4">
                  {stats.upcomingEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium">{event.title}</h3>
                        <div className="flex gap-2">
                          {event.eventType && (
                            <Badge className={getEventTypeColor(event.eventType)}>
                              {event.eventType}
                            </Badge>
                          )}
                          {event.businessCategory && (
                            <Badge variant="outline">{event.businessCategory}</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(event.startTime), 'MMM d, HH:mm')} - 
                          {format(new Date(event.endTime), 'HH:mm')}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                          </div>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {event.attendees.length} attendees
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming events found</p>
                  <p className="text-sm">Events will appear here after syncing</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Search & Insights */}
          {isConnected && (
            <>
              {/* Semantic Search */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Semantic Calendar Search
                  </CardTitle>
                  <CardDescription>
                    Search your calendar events using natural language (e.g., "yoga classes with Sarah", "meetings last month")
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Search your calendar..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchEvents()}
                      className="flex-1 px-3 py-2 border rounded-md"
                    />
                    <Button onClick={searchEvents} disabled={!searchQuery.trim()}>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </Button>
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Search Results:</h4>
                      {searchResults.map((result, index) => (
                        <div key={index} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <h5 className="font-medium">{result.event.title}</h5>
                            <Badge variant="secondary">{Math.round(result.similarity * 100)}% match</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(result.event.startTime), 'MMM d, yyyy HH:mm')}
                            {result.event.location && ` • ${result.event.location}`}
                          </div>
                          <div className="text-sm bg-gray-50 p-2 rounded">
                            {result.preview}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Insights */}
              {insights && (
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI Calendar Insights
                    </CardTitle>
                    <CardDescription>
                      Intelligent analysis of your calendar patterns and business trends
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {insights.patterns?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">📊 Patterns</h4>
                          <ul className="space-y-1 text-sm">
                            {insights.patterns.map((pattern: string, index: number) => (
                              <li key={index} className="text-muted-foreground">• {pattern}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {insights.busyTimes?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">⏰ Busy Times</h4>
                          <ul className="space-y-1 text-sm">
                            {insights.busyTimes.map((time: string, index: number) => (
                              <li key={index} className="text-muted-foreground">• {time}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {insights.recommendations?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">💡 Recommendations</h4>
                          <ul className="space-y-1 text-sm">
                            {insights.recommendations.map((rec: string, index: number) => (
                              <li key={index} className="text-muted-foreground">• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {insights.clientEngagement?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">🤝 Client Engagement</h4>
                          <ul className="space-y-1 text-sm">
                            {insights.clientEngagement.map((engagement: string, index: number) => (
                              <li key={index} className="text-muted-foreground">• {engagement}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Feature Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon: Advanced Features</CardTitle>
          <CardDescription>The full calendar intelligence system will include:</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Attendance Matching</h4>
              <p className="text-sm text-muted-foreground">Upload class attendance lists to automatically update client timelines</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">AI Insights</h4>
              <p className="text-sm text-muted-foreground">Get recommendations on client engagement and class optimization</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Drive Integration</h4>
              <p className="text-sm text-muted-foreground">Sync attendance sheets from Google Drive automatically</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Email Correlation</h4>
              <p className="text-sm text-muted-foreground">Track email communications and link to calendar events</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}