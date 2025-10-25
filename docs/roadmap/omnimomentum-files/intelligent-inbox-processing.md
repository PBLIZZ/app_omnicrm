# Intelligent Inbox Processing for OmniMomentum

## Overview

The Intelligent Inbox Processing system transforms the "dump everything" quick capture inbox into a powerful AI-powered task management tool. Instead of saving bulk input as a single task, the system intelligently:

1. **Splits bulk input** into individual, actionable tasks
2. **Categorizes by zones** (Life, Business, etc.)
3. **Assigns to projects** where applicable
4. **Detects hierarchies** (task/subtask, project/task relationships)
5. **Presents for approval** via HITL (Human-in-the-Loop) workflow

## Architecture

### Core Components

1. **Intelligent Inbox Processor** (`src/server/ai/connect/intelligent-inbox-processor.ts`)
   - AI service that analyzes bulk input
   - Splits text into individual tasks
   - Categorizes by zones and projects
   - Detects task hierarchies

2. **Approval Service** (`src/server/services/inbox-approval.service.ts`)
   - Manages HITL approval workflow
   - Stores processing results for review
   - Processes approved items into actual tasks/projects

3. **Enhanced Inbox Service** (`src/server/services/enhanced-inbox.service.ts`)
   - Integrates intelligent processing with existing inbox
   - Provides unified API for both modes

4. **API Endpoints**
   - `/api/omni-momentum/inbox/intelligent` - Intelligent quick capture
   - `/api/omni-momentum/inbox/approval` - Approval workflow management

5. **UI Components**
   - `IntelligentInboxWidget` - Main capture interface
   - `IntelligentProcessingApproval` - Review and approval UI

## Usage

### Basic Quick Capture

```typescript
// Enable intelligent processing
const result = await fetch('/api/omni-momentum/inbox', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: "Call John about project proposal, finish quarterly report by Friday, book dentist appointment",
    enableIntelligentProcessing: true
  })
});
```

### Direct Intelligent Processing

```typescript
// Use dedicated intelligent endpoint
const result = await fetch('/api/omni-momentum/inbox/intelligent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rawText: "Need to call John about the project proposal, finish the quarterly report by Friday, book dentist appointment, and organize the team meeting for next week",
    enableIntelligentProcessing: true
  })
});
```

### Approval Workflow

```typescript
// Get pending approvals
const pendingItems = await fetch('/api/omni-momentum/inbox/approval?action=list');

// Process approval
const approvalResult = await fetch('/api/omni-momentum/inbox/approval', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    inboxItemId: "uuid",
    approvedTasks: [
      {
        taskId: "uuid",
        approved: true,
        modifications: {
          name: "Updated task name",
          priority: "high"
        }
      }
    ],
    approvedProjects: [
      {
        projectId: "uuid",
        approved: true,
        modifications: {
          name: "Updated project name"
        }
      }
    ],
    approvedHierarchies: [
      {
        parentTaskId: "uuid",
        subtaskIds: ["uuid1", "uuid2"],
        relationshipType: "task_subtask",
        approved: true
      }
    ]
  })
});
```

## AI Processing Logic

### Task Splitting

The AI analyzes bulk input to identify individual, actionable tasks:

**Input:**

```bash
"Call John about project proposal, finish quarterly report by Friday, book dentist appointment, organize team meeting for next week"
```

**Output:**

```json
{
  "extractedTasks": [
    {
      "id": "uuid1",
      "name": "Call John about project proposal",
      "priority": "medium",
      "estimatedMinutes": 15,
      "zoneId": 2, // Business zone
      "projectId": "project-uuid",
      "confidence": 0.9
    },
    {
      "id": "uuid2", 
      "name": "Finish quarterly report",
      "priority": "high",
      "dueDate": "2024-01-15",
      "estimatedMinutes": 120,
      "zoneId": 2,
      "projectId": "project-uuid",
      "confidence": 0.95
    }
  ]
}
```

### Zone Categorization

Tasks are automatically categorized into zones:

- **Life Zone**: Personal tasks, health, family, etc.
- **Business Zone**: Work tasks, projects, meetings, etc.
- **Learning Zone**: Education, skill development, etc.
- **Health Zone**: Exercise, medical appointments, etc.

### Project Assignment

The AI identifies when tasks belong together and suggests project groupings:

```json
{
  "suggestedProjects": [
    {
      "id": "project-uuid",
      "name": "Q1 Quarterly Report",
      "description": "Tasks related to quarterly reporting",
      "zoneId": 2,
      "status": "active",
      "confidence": 0.85
    }
  ]
}
```

### Hierarchy Detection

The system detects relationships between tasks:

```json
{
  "taskHierarchies": [
    {
      "parentTaskId": "main-task-uuid",
      "subtaskIds": ["subtask1-uuid", "subtask2-uuid"],
      "relationshipType": "task_subtask",
      "confidence": 0.8
    }
  ]
}
```

## Configuration

### Environment Variables

Ensure these are configured for AI processing:

```env
OPENROUTER_API_KEY=your_api_key
OPENROUTER_MODEL=your_preferred_model
```

### Zone Setup

Zones must be configured in the database:

```sql
INSERT INTO zones (id, name, color, icon_name) VALUES
(1, 'Life', '#3B82F6', 'home'),
(2, 'Business', '#10B981', 'briefcase'),
(3, 'Learning', '#8B5CF6', 'book'),
(4, 'Health', '#F59E0B', 'heart');
```

## Error Handling

### Fallback Behavior

If AI processing fails:

1. **AI Unavailable**: Falls back to manual processing
2. **Processing Error**: Creates fallback task with low confidence
3. **Validation Error**: Returns error with details

### Confidence Scoring

- **High (0.8-1.0)**: Clear, unambiguous tasks
- **Medium (0.6-0.8)**: Good confidence with minor uncertainty
- **Low (0.3-0.6)**: Requires human review
- **Very Low (<0.3)**: Fallback processing

## Performance Considerations

### Rate Limiting

- AI processing is rate-limited per user
- Bulk processing limited to 50 items per request
- Processing timeout of 30 seconds

### Caching

- Zone data cached for processing context
- Processing results cached for approval workflow
- Stats cached for dashboard performance

## Testing

### Unit Tests

```bash
# Test intelligent processing
pnpm test src/server/ai/connect/intelligent-inbox-processor.test.ts

# Test approval workflow
pnpm test src/server/services/inbox-approval.service.test.ts
```

### Integration Tests

```bash
# Test full workflow
pnpm test:e2e e2e/intelligent-inbox-flow.spec.ts
```

## Monitoring

### Metrics

- Processing success rate
- Average confidence scores
- Approval/rejection rates
- Processing time per item

### Logging

All processing steps are logged with:

- User ID
- Processing duration
- Confidence scores
- Error details

## Future Enhancements

1. **Learning from User Behavior**: Improve AI suggestions based on approval patterns
2. **Custom Zone Training**: Allow users to train AI on their specific zones
3. **Batch Processing**: Process multiple inbox items simultaneously
4. **Template Recognition**: Learn common task patterns and suggest templates
5. **Integration with Calendar**: Auto-schedule tasks based on due dates and availability

## Troubleshooting

### Common Issues

1. **AI Processing Not Available**
   - Check OpenRouter configuration
   - Verify API key is valid
   - Check network connectivity

2. **Low Confidence Scores**
   - Input text may be ambiguous
   - Try breaking down into smaller chunks
   - Use more specific language

3. **Approval Workflow Issues**
   - Check database connectivity
   - Verify user permissions
   - Check for validation errors

### Debug Mode

Enable debug logging:

```env
DEBUG=intelligent-inbox:*
```

This will provide detailed logs of the AI processing pipeline.
