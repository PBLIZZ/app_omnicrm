
# ===== COMPLETE INTEGRATION EXAMPLE =====

Shows how Global Search + RAG Chat work together in your wellness app

## 1. ROOT LAYOUT (app/layout.tsx)

```typescript

import { GlobalSearchProvider } from '@/contexts/GlobalSearchContext'
import { RAGProvider } from '@/contexts/RAGContext'
import { GlobalSearchModal } from '@/components/GlobalSearchModal'
import '@/styles/globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50">
        <GlobalSearchProvider>
          <RAGProvider>
            {/*Main app content*/}
            {children}

            {/* Global search modal - available everywhere */}
            <GlobalSearchModal />
          </RAGProvider>
        </GlobalSearchProvider>
      </body>
    </html>
  )
}
```

## 2. MAIN DASHBOARD (app/dashboard/page.tsx)

```typescript

"use client"
import { useGlobalSearch } from '@/contexts/GlobalSearchContext'
import { ChatAssistant } from '@/components/ChatAssistant'
import { SearchTrigger } from '@/components/SearchTrigger'
import { DashboardStats } from '@/components/DashboardStats'
import { RecentActivity } from '@/components/RecentActivity'
import { UpcomingApppointments } from '@/components/UpcomingAppointments'

export default function Dashboard() {
  return (
    <div className="min-h-full">
      {/*Header with search trigger*/}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Wellness Practice Dashboard
              </h1>
            </div>

            {/* Global search trigger */}
            <SearchTrigger />
          </div>
        </div>
      </header>

      {/* Main dashboard content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Main content area */}
          <div className="lg:col-span-3 space-y-8">
            {/* Stats overview */}
            <DashboardStats />

            {/* Recent activity and upcoming appointments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <RecentActivity />
              <UpcomingApppointments />
            </div>
          </div>

          {/* AI Assistant sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <ChatAssistant className="h-[700px]" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
```

## 3. SEARCH TRIGGER COMPONENT (app/components/SearchTrigger.tsx)

```typescript

"use client"
import { useGlobalSearch } from '@/contexts/GlobalSearchContext'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export function SearchTrigger() {
  const { openSearch } = useGlobalSearch()

  return (
    <button
      onClick={openSearch}
      className="flex items-center space-x-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
    >
      <MagnifyingGlassIcon className="h-4 w-4" />
      <span className="hidden sm:block text-sm">Search anything...</span>
      <kbd className="hidden sm:block px-2 py-1 text-xs bg-gray-200 rounded border">
        ⌘K
      </kbd>
    </button>
  )
}
```

## 4. DASHBOARD STATS WITH SEARCH INTEGRATION (app/components/DashboardStats.tsx)

```typescript

"use client"
import { useGlobalSearch } from '@/contexts/GlobalSearchContext'
import { useRAG } from '@/contexts/RAGContext'

export function DashboardStats() {
  const { openSearch, performSearch } = useGlobalSearch()
  const { sendMessage } = useRAG()

  // Quick search actions
  const handleQuickSearch = async (query: string) => {
    openSearch()
    await performSearch(query)
  }

  // Quick chat actions
  const handleQuickChat = (message: string) => {
    sendMessage(message)
  }

  const stats = [
    {
      name: 'Active Clients',
      value: '124',
      change: '+12%',
      changeType: 'positive',
      searchQuery: 'clients active',
      chatQuery: 'Show me insights about my active clients'
    },
    {
      name: "Today's Appointments",
      value: '8',
      change: '+2',
      changeType: 'positive',
      searchQuery: 'appointments today',
      chatQuery: "What's my schedule looking like today?"
    },
    {
      name: 'Pending Tasks',
      value: '15',
      change: '+3',
      changeType: 'negative',
      searchQuery: 'tasks pending',
      chatQuery: 'What tasks do I need to complete?'
    },
    {
      name: 'This Month Revenue',
      value: '$12,450',
      change: '+18%',
      changeType: 'positive',
      searchQuery: 'revenue this month',
      chatQuery: 'How is my revenue performing this month?'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.name}</p>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </div>
            <div className={`text-sm ${
              stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
            }`}>
              {stat.change}
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="mt-4 flex space-x-2">
            <button
              onClick={() => handleQuickSearch(stat.searchQuery)}
              className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
              title="Search for details"
            >
              🔍 Search
            </button>
            <button
              onClick={() => handleQuickChat(stat.chatQuery)}
              className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 transition-colors"
              title="Ask AI assistant"
            >
              🤖 Ask AI
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

## 5. CLIENT DETAIL PAGE WITH INTEGRATED SEARCH (app/clients/[id]/page.tsx)

```typescript

"use client"
import { useGlobalSearch } from '@/contexts/GlobalSearchContext'
import { useRAG } from '@/contexts/RAGContext'
import { useState, useEffect } from 'react'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  notes: string
  created_at: string
}

export default function ClientDetail({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<Client | null>(null)
  const { performSearch } = useGlobalSearch()
  const { sendMessage } = useRAG()

  useEffect(() => {
    // Load client data
    loadClientData(params.id)
  }, [params.id])

  const loadClientData = async (id: string) => {
    // Implement client data loading
    // setClient(data)
  }

  // Search for related content
  const searchRelated = (type: string) => {
    if (!client) return

    const queries = {
      appointments: `appointments ${client.name}`,
      notes: `notes ${client.name}`,
      tasks: `tasks ${client.name}`,
      goals: `goals ${client.name}`
    }

    performSearch(queries[type as keyof typeof queries])
  }

  // Ask AI about client
  const askAboutClient = (topic: string) => {
    if (!client) return

    const questions = {
      progress: `How is ${client.name} progressing with their goals?`,
      history: `What's the history of my work with ${client.name}?`,
      next_steps: `What should be the next steps for ${client.name}?`,
      patterns: `What patterns do you notice in ${client.name}'s appointments?`
    }

    sendMessage(questions[topic as keyof typeof questions])
  }

  if (!client) return <div>Loading...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/*Client header*/}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-600">{client.email} • {client.phone}</p>
          </div>

          {/* AI insights button */}
          <button
            onClick={() => askAboutClient('progress')}
            className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600"
          >
            🤖 Get AI Insights
          </button>
        </div>
      </div>

      {/* Related content sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {['appointments', 'notes', 'tasks', 'goals'].map((type) => (
          <button
            key={type}
            onClick={() => searchRelated(type)}
            className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow text-left"
          >
            <div className="text-lg font-semibold capitalize">{type}</div>
            <div className="text-sm text-gray-600 mt-1">
              Search all {type} for {client.name}
            </div>
          </button>
        ))}
      </div>

      {/* AI-powered insights */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">AI-Powered Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'progress', label: 'Progress Analysis', icon: '📈' },
            { key: 'history', label: 'Client History', icon: '📋' },
            { key: 'next_steps', label: 'Recommended Next Steps', icon: '🎯' },
            { key: 'patterns', label: 'Pattern Analysis', icon: '🔍' }
          ].map((insight) => (
            <button
              key={insight.key}
              onClick={() => askAboutClient(insight.key)}
              className="text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <span className="text-xl">{insight.icon}</span>
                <span className="font-medium">{insight.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

```

## 6. ENVIRONMENT VARIABLES (.env.local)

```typescript

// Supabase

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

// Redis

REDIS_URL=your_redis_url

// OpenRouter

OPENROUTER_API_KEY=your_openrouter_key

```

## 7. PACKAGE.JSON DEPENDENCIES

```json

{
  "dependencies": {
    "next": "^15.0.0",
    "@supabase/supabase-js": "^2.38.0",
    "drizzle-orm": "^0.29.0",
    "ioredis": "^5.3.2",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-hotkeys-hook": "^4.4.1",
    "framer-motion": "^10.16.4",
    "@heroicons/react": "^2.0.18",
    "@headlessui/react": "^1.7.17"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31"
  }
}
```

## 8. USAGE EXAMPLES & INTEGRATION POINTS

```typescript

// Header component with search trigger
import { SearchTrigger } from '@/components/SearchTrigger'

// Dashboard with stats that trigger search/chat
import { DashboardStats } from '@/components/DashboardStats'

// Client pages with contextual search
import { ClientDetail } from '@/app/clients/[id]/page'

// Any component can trigger global search
const { openSearch, performSearch } = useGlobalSearch()

// Any component can send messages to AI
const { sendMessage } = useRAG()

// Example: Smart button that searches or chats based on content
<button onClick={() => {
  if (needsSearch) {
    performSearch('client appointments today')
  } else {
    sendMessage('What appointments do I have today?')
  }
}}>
  Find Todays Appointments
</button>

```

## 9. DEPLOYMENT CHECKLIST

### SUPABASE SETUP

* Enable pgvector extension
* Run the database schema from global_search_implementation.txt
* Set up RLS policies for document_embeddings table
* Configure environment variables

### REDIS SETUP

* Deploy Redis instance (Upstash recommended)
* Configure Redis URL in environment

### OPENROUTER SETUP

* Sign up for OpenRouter account
* Get API key and add to environment
* Test embedding generation

### NEXT.JS DEPLOYMENT

* Deploy to Vercel/Railway/similar
* Set environment variables
* Test search functionality
* Monitor performance and costs

## MONITORING & ANALYTICS

```typescript

// Track search usage
const trackSearch = (query: string, resultCount: number, searchType: string) => {
  // Analytics implementation
  analytics.track('Global Search Used', {
    query: query.length, // Don't log actual query for privacy
    resultCount,
    searchType,
    timestamp: new Date()
  })
}

// Track chat usage  
const trackChatMessage = (messageLength: number, sourceCount: number) => {
  analytics.track('RAG Chat Used', {
    messageLength,
    sourceCount,
    timestamp: new Date()
  })
}

// Monitor performance
const monitorSearchPerformance = (searchType: string, duration: number) => {
  if (duration > 1000) {
    console.warn(`Slow ${searchType} search: ${duration}ms`)
  }
}

// Cost monitoring
const monitorEmbeddingCosts = (tokenCount: number) => {
  const cost = (tokenCount / 1000000) * 0.02 // $0.02 per 1M tokens

  // Alert if monthly costs exceed threshold
  if (cost > monthlyBudget) {
    console.warn('Embedding costs exceeding budget')
  }
}

```
