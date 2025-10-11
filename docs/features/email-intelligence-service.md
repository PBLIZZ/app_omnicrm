# Email Intelligence Service

The Email Intelligence Service extends the existing LLM service to provide comprehensive email analysis and business intelligence for wellness practitioners.

## Overview

This service processes Gmail raw events to extract actionable business insights including:

- **Email Classification**: Categorizes emails by business relevance and type
- **Contact Matching**: Associates emails with existing contacts in the CRM
- **Business Intelligence**: Extracts key insights and marketing opportunities
- **Weekly Digests**: Generates comprehensive business intelligence summaries

## Architecture

### Core Components

1. **Email Intelligence Service** (`/src/server/services/email-intelligence.service.ts`)
   - Main service implementing LLM-powered email analysis
   - Follows existing LLM service patterns with OpenRouter integration
   - Uses guardrails and AI quota management

2. **Job Processors** (`/src/server/jobs/processors/email-intelligence.ts`)
   - Background job processing for batch email analysis
   - Integrates with existing job queue system
   - Supports batch processing and cleanup operations

3. **API Endpoints** (`/src/app/api/admin/email-intelligence/route.ts`)
   - Admin endpoints for triggering email intelligence processing
   - Testing and manual processing capabilities

4. **Type Definitions** (Updated in `/src/server/jobs/types.ts`)
   - New job types: `email_intelligence`, `email_intelligence_batch`, `email_intelligence_cleanup`
   - Proper payload typing for each job type

## Key Functions

### Email Categorization

```typescript
await categorizeEmail(userId, {
  subject: "Subject line",
  bodyText: "Email content...",
  senderEmail: "sender@example.com",
  senderName: "Sender Name",
  occurredAt: new Date()
});
```

**Categories:**

- `client_communication` - Direct client communication
- `business_intelligence` - Industry insights and thought leadership
- `educational` - Learning materials and courses
- `administrative` - Invoices, payments, legal matters
- `marketing` - Promotions and advertising
- `personal` - Personal messages
- `spam` - Irrelevant content

**Subcategories:**

- `marketing`, `thought_leadership`, `course_content`
- `client_inquiry`, `appointment_related`, `invoice_payment`
- `general_business`, `newsletter`, `promotion`
- `personal_note`, `spam_likely`

### Business Intelligence Extraction

```typescript
await extractWisdom(userId, {
  subject: "Subject line",
  bodyText: "Email content...",
  classification: emailClassification
});
```

**Extracted Data:**

- Key business insights (2-4 most important points)
- Actionable next steps
- Wellness industry tags (36 categories)
- Marketing tips and growth opportunities
- Client mood assessment
- Follow-up recommendations

### Contact Matching

```typescript
await matchToContacts(userId, {
  senderEmail: "client@example.com",
  senderName: "Client Name",
  bodyText: "Email content for context..."
});
```

**Matching Logic:**

1. **Exact email match** (95% confidence)
2. **Fuzzy name matching** (60-85% confidence)
3. **New contact suggestions** (LLM-powered recommendations)

### Weekly Business Digest

```typescript
await generateWeeklyDigest(userId, {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-07')
});
```

**Digest Contents:**

- Email activity summary and metrics
- Business opportunity identification
- Client mood trend analysis
- Marketing intelligence insights
- Actionable recommendations

## Job Processing

### Single Email Processing

```typescript
// Via API
POST /api/admin/email-intelligence
{
  "action": "process_single",
  "rawEventId": "uuid-of-gmail-raw-event"
}
```

### Batch Processing

```typescript
// Via job queue
await enqueue("email_intelligence_batch", {
  batchId: "optional-batch-id",
  maxItems: 50,
  onlyUnprocessed: true
}, userId);
```

### Cleanup Operations

```typescript
// Cleanup old insights
await enqueue("email_intelligence_cleanup", {
  retentionDays: 90,
  keepHighValue: true // Preserve high business relevance insights
}, userId);
```

## Integration Points

### Database Storage

Email intelligence results are stored in the `ai_insights` table:

```sql
INSERT INTO ai_insights (
  user_id, subject_type, subject_id, kind, content, model
) VALUES (
  $userId, 'inbox', $rawEventId, 'email_intelligence', $intelligence, $model
);
```

### Existing Services Integration

- **LLM Service**: Uses existing OpenRouter patterns and guardrails
- **Contact System**: Matches emails to contacts using existing contact schema
- **Job Queue**: Integrates with existing background job processing
- **AI Quotas**: Respects existing AI usage limits and tracking

## Wellness Business Intelligence

### Industry-Specific Categories

**36 Wellness Tags** organized in 4 categories:

1. **Services** (14): Yoga, Massage, Meditation, Pilates, Reiki, Acupuncture, Personal Training, Nutrition Coaching, Life Coaching, Therapy, Workshops, Retreats, Group Classes, Private Sessions

2. **Demographics** (11): Senior, Young Adult, Professional, Parent, Student, Beginner, Intermediate, Advanced, VIP, Local, Traveler

3. **Goals & Health** (11): Stress Relief, Weight Loss, Flexibility, Strength Building, Pain Management, Mental Health, Spiritual Growth, Mindfulness, Athletic Performance, Injury Recovery, Prenatal/Postnatal

4. **Engagement** (10): Regular Attendee, Weekend Warrior, Early Bird, Evening Preferred, Seasonal Client, Frequent Visitor, Occasional Visitor, High Spender, Referral Source, Social Media Active

### Client Lifecycle Intelligence

**7 Client Stages** with AI-powered assessment:

- **Prospect**: 1-2 events, recent inquiries
- **New Client**: 2-5 events, getting started
- **Core Client**: 6+ events, regular attendance
- **Referring Client**: Evidence of bringing others
- **VIP Client**: High frequency (10+ events) + premium services
- **Lost Client**: No recent activity (60+ days)
- **At Risk Client**: Declining attendance pattern

## Usage Examples

### Manual Processing (Admin/Testing)

```bash
# Process a single Gmail raw event
curl -X POST "/api/admin/email-intelligence" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "process_single",
    "rawEventId": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Generate weekly digest
curl -X POST "/api/admin/email-intelligence" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "weekly_digest",
    "generateWeekly": true
  }'

# Get statistics
curl -X GET "/api/admin/email-intelligence?days=30&limit=20"
```

### Integration with Gmail Sync Pipeline

The service is designed to integrate with the existing Gmail sync pipeline:

1. Gmail raw events are ingested via existing sync jobs
2. Email intelligence jobs are automatically enqueued for new emails
3. Results are stored as AI insights with proper classification
4. Weekly digests can be generated on schedule

### Performance Considerations

- **Rate Limiting**: Respects OpenRouter API limits with built-in delays
- **Batch Processing**: Processes emails sequentially to avoid overwhelming LLM APIs
- **Cleanup Jobs**: Automatic cleanup of low-value insights to prevent database bloat
- **Caching**: Deduplication prevents reprocessing the same email

## Security & Privacy

- **User Scoping**: All operations are user-scoped with proper authorization
- **Data Retention**: Configurable retention policies for email intelligence
- **High-Value Preservation**: Important business insights can be preserved longer
- **AI Guardrails**: Full integration with existing AI quota and safety systems

## Future Enhancements

### Planned Features

1. **Real-time Processing**: Webhook-based processing for immediate insights
2. **Custom Categories**: User-defined email categories for specific business types
3. **Integration Triggers**: Automatic task/appointment creation based on email content
4. **Sentiment Analysis**: Advanced client mood tracking over time
5. **Competitive Intelligence**: Analysis of competitor mentions and market trends

### Performance Optimizations

1. **Embedding-based Matching**: Use vector similarity for better contact matching
2. **Incremental Processing**: Process only new/changed emails
3. **Caching Layer**: Cache common classifications and insights
4. **Batch Optimization**: Smarter batching based on email similarity

## Testing

The service includes comprehensive testing capabilities:

- **Admin API endpoints** for manual testing and debugging
- **Statistics endpoint** for monitoring processing results
- **Error handling** with detailed logging for troubleshooting
- **Job status tracking** for monitoring batch operations

This email intelligence service provides a solid foundation for extracting business value from email communications while following established patterns in the OmniCRM codebase.
