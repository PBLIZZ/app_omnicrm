# OmniCRM Contact Management System - Frontend Design Specification

**Date:** August 12, 2025  
**Version:** 1.0  
**Scope:** Complete contact management system design for AI-driven CRM platform  
**Target:** Production-ready implementation for wellness practitioners  
**Base Architecture:** Existing shadcn/ui design system with comprehensive database schema

---

## Executive Summary

This specification defines a comprehensive contact management system for OmniCRM, transforming the current placeholder interface into a production-ready AI-driven CRM platform for wellness practitioners. The design leverages the existing robust database schema (contacts, interactions, embeddings, ai_insights tables) and Google sync infrastructure while implementing a modern, accessible, and mobile-optimized user experience.

### Key Design Principles

1. **Contact-Centric Architecture**: Contacts as the central hub for all CRM activities
2. **AI-Enhanced Experience**: Seamless integration of AI insights and recommendations
3. **Wellness Practitioner Focused**: Workflows optimized for solo practice management
4. **European Standards**: DD/MM/YYYY dates, GDPR compliance, privacy-first design
5. **Accessibility First**: WCAG 2.1 AA compliance as fundamental requirement
6. **Mobile-Touch Optimized**: Swipe actions, responsive layouts, offline capabilities

### Current State Analysis

**Database Foundation (Excellent):**

- Comprehensive schema with contacts, interactions, embeddings, ai_insights tables
- Full audit trail with sync_audit and proper user scoping
- AI-ready infrastructure with pgvector support and cost tracking

**Design System (Strong Foundation):**

- shadcn/ui components with accessibility built-in
- Consistent color palette using oklch color space
- Comprehensive component variants (buttons, forms, cards, etc.)

**Critical Gaps to Address:**

- No contact management UI implementation
- Missing AI assistant chat interface
- Placeholder homepage content
- Inconsistent button/form implementations
- Accessibility violations in existing components

---

## 1. Contact List Interface - Main Dashboard

### 1.1 Primary Contact Dashboard

**Route:** `/contacts`  
**Purpose:** Central hub for all contact management activities

#### Layout Architecture

```tsx
<div className="h-screen flex flex-col">
  {/* Header with search, filters, and actions */}
  <ContactListHeader
    searchQuery={searchQuery}
    onSearch={setSearchQuery}
    selectedCount={selectedContacts.length}
    onBulkActions={handleBulkActions}
    onNewContact={openNewContactDialog}
  />

  {/* Main content area */}
  <div className="flex flex-1 overflow-hidden">
    {/* Sidebar filters (desktop) */}
    <ContactFilters
      className="hidden lg:block w-64 border-r"
      filters={filters}
      onChange={setFilters}
    />

    {/* Contact list */}
    <div className="flex-1 overflow-auto">
      <ContactList
        contacts={filteredContacts}
        selectedIds={selectedContacts}
        onSelect={handleContactSelect}
        onOpenDetails={openContactDetails}
        loading={isLoading}
      />
    </div>

    {/* Contact details panel (desktop) */}
    <ContactDetailsPanel
      className="hidden xl:block w-96 border-l"
      contactId={selectedContactId}
      onClose={closeContactDetails}
    />
  </div>
</div>
```

#### Header Implementation

**Search and Filter Interface:**

```tsx
const ContactListHeader = ({
  searchQuery,
  onSearch,
  selectedCount,
  onBulkActions,
  onNewContact,
}) => {
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex flex-col space-y-4 p-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        {/* Title and stats */}
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-sm text-muted-foreground">
              {totalContacts} contacts • {activeContacts} active • Last synced {lastSyncTime}
            </p>
          </div>
          <SyncStatusIndicator status={syncStatus} lastSync={lastSyncTime} />
        </div>

        {/* Search and actions */}
        <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:space-y-0 lg:space-x-3">
          {/* Search with keyboard shortcut */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts... (⌘K)"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9 w-full lg:w-80"
              onKeyDown={handleSearchKeyboard}
            />
          </div>

          {/* Filter toggle (mobile) */}
          <Button variant="outline" size="sm" onClick={toggleMobileFilters} className="lg:hidden">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button onClick={onNewContact} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Contact
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleImportContacts}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Contacts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportContacts}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Contacts
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSyncNow}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Bulk selection bar */}
      {selectedCount > 0 && (
        <div className="border-t bg-muted/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedCount} contact{selectedCount === 1 ? "" : "s"} selected
            </span>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={() => onBulkActions("email")}>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button size="sm" variant="outline" onClick={() => onBulkActions("tag")}>
                <Tag className="h-4 w-4 mr-2" />
                Add Tags
              </Button>
              <Button size="sm" variant="outline" onClick={() => onBulkActions("export")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onBulkActions("delete")}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

#### Advanced Search and Filtering

**Filter Sidebar (Desktop):**

```tsx
const ContactFilters = ({ filters, onChange, className }) => {
  return (
    <div className={cn("p-4 space-y-6", className)}>
      <div>
        <h3 className="font-medium mb-3">Filter Contacts</h3>

        {/* Quick filters */}
        <div className="space-y-2 mb-4">
          <FilterToggle
            label="Recently active"
            checked={filters.recentlyActive}
            onChange={(checked) => onChange({ ...filters, recentlyActive: checked })}
            count={getFilterCount("recentlyActive")}
          />
          <FilterToggle
            label="Has email"
            checked={filters.hasEmail}
            onChange={(checked) => onChange({ ...filters, hasEmail: checked })}
            count={getFilterCount("hasEmail")}
          />
          <FilterToggle
            label="Has phone"
            checked={filters.hasPhone}
            onChange={(checked) => onChange({ ...filters, hasPhone: checked })}
            count={getFilterCount("hasPhone")}
          />
          <FilterToggle
            label="Needs follow-up"
            checked={filters.needsFollowup}
            onChange={(checked) => onChange({ ...filters, needsFollowup: checked })}
            count={getFilterCount("needsFollowup")}
          />
        </div>
      </div>

      {/* Source filters */}
      <div>
        <h4 className="font-medium text-sm mb-2">Source</h4>
        <div className="space-y-1">
          {["gmail_import", "manual", "upload", "calendar_sync"].map((source) => (
            <FilterToggle
              key={source}
              label={formatSourceLabel(source)}
              checked={filters.sources?.includes(source)}
              onChange={(checked) => toggleSourceFilter(source, checked)}
              count={getSourceCount(source)}
            />
          ))}
        </div>
      </div>

      {/* Date range filter */}
      <div>
        <h4 className="font-medium text-sm mb-2">Last Contact</h4>
        <Select
          value={filters.dateRange}
          onValueChange={(value) => onChange({ ...filters, dateRange: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="quarter">Last 3 months</SelectItem>
            <SelectItem value="year">This year</SelectItem>
            <SelectItem value="custom">Custom range...</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* AI insights filter */}
      <div>
        <h4 className="font-medium text-sm mb-2 flex items-center">
          <Sparkles className="h-3 w-3 mr-1 text-violet-600" />
          AI Insights
        </h4>
        <div className="space-y-1">
          <FilterToggle
            label="High priority"
            checked={filters.aiInsights?.highPriority}
            onChange={(checked) =>
              onChange({
                ...filters,
                aiInsights: { ...filters.aiInsights, highPriority: checked },
              })
            }
            count={getAIInsightCount("high_priority")}
          />
          <FilterToggle
            label="At risk"
            checked={filters.aiInsights?.atRisk}
            onChange={(checked) =>
              onChange({
                ...filters,
                aiInsights: { ...filters.aiInsights, atRisk: checked },
              })
            }
            count={getAIInsightCount("at_risk")}
          />
          <FilterToggle
            label="Strong relationship"
            checked={filters.aiInsights?.strongRelation}
            onChange={(checked) =>
              onChange({
                ...filters,
                aiInsights: { ...filters.aiInsights, strongRelation: checked },
              })
            }
            count={getAIInsightCount("strong_relationship")}
          />
        </div>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={clearAllFilters} className="w-full">
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  );
};
```

#### Contact List Implementation

**List Layout with Virtual Scrolling:**

```tsx
const ContactList = ({ contacts, selectedIds, onSelect, onOpenDetails, loading }) => {
  const [sortBy, setSortBy] = useState("lastContact");
  const [sortDirection, setSortDirection] = useState("desc");

  if (loading) {
    return <ContactListSkeleton />;
  }

  if (contacts.length === 0) {
    return <ContactListEmpty />;
  }

  const sortedContacts = sortContacts(contacts, sortBy, sortDirection);

  return (
    <div className="divide-y">
      {/* Sort header */}
      <div className="sticky top-0 bg-background border-b px-4 py-2">
        <div className="flex items-center space-x-4 text-sm">
          <SortButton
            label="Name"
            active={sortBy === "name"}
            direction={sortDirection}
            onClick={() => handleSort("name")}
          />
          <SortButton
            label="Last Contact"
            active={sortBy === "lastContact"}
            direction={sortDirection}
            onClick={() => handleSort("lastContact")}
          />
          <SortButton
            label="Added"
            active={sortBy === "createdAt"}
            direction={sortDirection}
            onClick={() => handleSort("createdAt")}
          />
          <div className="flex-1" />
          <span className="text-muted-foreground">
            {contacts.length} result{contacts.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Contact list with virtual scrolling for performance */}
      <VirtualizedList height={600} itemCount={sortedContacts.length} itemSize={80} overscan={5}>
        {({ index, style }) => (
          <div style={style}>
            <ContactListItem
              contact={sortedContacts[index]}
              selected={selectedIds.includes(sortedContacts[index].id)}
              onSelect={() => onSelect(sortedContacts[index].id)}
              onOpenDetails={() => onOpenDetails(sortedContacts[index].id)}
            />
          </div>
        )}
      </VirtualizedList>
    </div>
  );
};
```

**Individual Contact Item:**

```tsx
const ContactListItem = ({ contact, selected, onSelect, onOpenDetails }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "flex items-center p-4 cursor-pointer transition-colors hover:bg-muted/50",
        "focus-within:bg-muted/50 group",
        selected && "bg-primary/5 border-l-4 border-l-primary",
      )}
      onClick={onOpenDetails}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetails();
        }
      }}
    >
      {/* Selection checkbox */}
      <Checkbox
        checked={selected}
        onCheckedChange={onSelect}
        onClick={(e) => e.stopPropagation()}
        className="mr-3"
        aria-label={`Select ${contact.displayName}`}
      />

      {/* Avatar */}
      <Avatar className="h-10 w-10 mr-3">
        <AvatarImage src={contact.avatar} alt={contact.displayName} />
        <AvatarFallback>{getInitials(contact.displayName)}</AvatarFallback>
      </Avatar>

      {/* Contact info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium truncate">{contact.displayName}</h3>
          {contact.aiInsight && (
            <AIInsightBadge type={contact.aiInsight.kind} priority={contact.aiInsight.priority} />
          )}
        </div>

        <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
          {contact.primaryEmail && (
            <div className="flex items-center space-x-1">
              <Mail className="h-3 w-3" />
              <span className="truncate max-w-48">{contact.primaryEmail}</span>
            </div>
          )}
          {contact.primaryPhone && (
            <div className="flex items-center space-x-1">
              <Phone className="h-3 w-3" />
              <span>{formatPhoneNumber(contact.primaryPhone)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
          <span>
            Last contact:{" "}
            {contact.lastInteraction
              ? formatEuropeanDate(contact.lastInteraction.occurredAt)
              : "Never"}
          </span>
          <span>Added: {formatEuropeanDate(contact.createdAt)}</span>
          <ContactSourceBadge source={contact.source} />
        </div>
      </div>

      {/* Quick actions (visible on hover) */}
      <div
        className={cn(
          "flex items-center space-x-1 opacity-0 transition-opacity",
          (isHovered || selected) && "opacity-100",
        )}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendEmail(contact);
                }}
              >
                <Mail className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send email</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {contact.primaryPhone && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCall(contact);
                  }}
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Call</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  handleScheduleMeeting(contact);
                }}
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Schedule meeting</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};
```

#### Mobile-Optimized List with Swipe Actions

**Mobile Contact Item with Swipe:**

```tsx
const MobileContactItem = ({ contact, selected, onSelect, onOpenDetails }) => {
  return (
    <SwipeableRow
      leftActions={[
        {
          icon: Mail,
          label: "Email",
          color: "bg-blue-500",
          action: () => handleEmail(contact),
        },
        {
          icon: Phone,
          label: "Call",
          color: "bg-green-500",
          action: () => handleCall(contact),
        },
      ]}
      rightActions={[
        {
          icon: Calendar,
          label: "Schedule",
          color: "bg-amber-500",
          action: () => handleSchedule(contact),
        },
        {
          icon: Trash2,
          label: "Delete",
          color: "bg-red-500",
          action: () => handleDelete(contact),
        },
      ]}
    >
      <div className="flex items-center p-4 bg-background min-h-[72px] touch-manipulation">
        {/* Mobile-optimized touch targets */}
        <div className="flex-1 min-w-0" onClick={onOpenDetails} role="button" tabIndex={0}>
          <div className="flex items-start space-x-3">
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarImage src={contact.avatar} alt={contact.displayName} />
              <AvatarFallback>{getInitials(contact.displayName)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-base truncate">{contact.displayName}</h3>
                {contact.aiInsight && (
                  <AIInsightBadge
                    type={contact.aiInsight.kind}
                    priority={contact.aiInsight.priority}
                    size="sm"
                  />
                )}
              </div>

              <p className="text-sm text-muted-foreground truncate">
                {contact.primaryEmail || contact.primaryPhone || "No contact info"}
              </p>

              <p className="text-xs text-muted-foreground">
                Last:{" "}
                {contact.lastInteraction
                  ? formatRelativeTime(contact.lastInteraction.occurredAt)
                  : "Never"}
              </p>
            </div>
          </div>
        </div>

        {/* Selection indicator */}
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
          className="ml-3"
          style={{ minWidth: "44px", minHeight: "44px" }} // Touch target
          aria-label={`Select ${contact.displayName}`}
        />
      </div>
    </SwipeableRow>
  );
};
```

---

## 2. Individual Contact Pages

### 2.1 Contact Detail View

**Route:** `/contacts/[id]`  
**Purpose:** Comprehensive contact information with timeline and AI insights

#### Main Contact Layout

```tsx
const ContactDetailPage = ({ contactId }) => {
  const { contact, interactions, aiInsights, loading } = useContactDetails(contactId);

  if (loading) {
    return <ContactDetailSkeleton />;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <ContactDetailHeader contact={contact} />

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Contact info cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ContactInfoCard contact={contact} className="lg:col-span-2" />
              <ContactStatsCard contact={contact} />
            </div>

            {/* AI Insights */}
            <AIInsightsSection insights={aiInsights} contactId={contactId} />

            {/* Interaction Timeline */}
            <InteractionTimeline interactions={interactions} contactId={contactId} />
          </div>
        </div>

        {/* AI Assistant Panel */}
        <ContactAIChatPanel contactId={contactId} className="hidden xl:block w-80 border-l" />
      </div>
    </div>
  );
};
```

#### Contact Header Implementation

```tsx
const ContactDetailHeader = ({ contact }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="border-b bg-background/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-start justify-between">
          {/* Left side: Contact info */}
          <div className="flex items-start space-x-6">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={contact.avatar} alt={contact.displayName} />
                <AvatarFallback className="text-2xl">
                  {getInitials(contact.displayName)}
                </AvatarFallback>
              </Avatar>
              <ContactStatusIndicator
                status={contact.status}
                className="absolute -bottom-1 -right-1"
              />
            </div>

            {/* Contact details */}
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold">{contact.displayName}</h1>
                <ContactSourceBadge source={contact.source} />
                {contact.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex flex-col space-y-1">
                {contact.primaryEmail && (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${contact.primaryEmail}`} className="hover:underline">
                      {contact.primaryEmail}
                    </a>
                  </div>
                )}
                {contact.primaryPhone && (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${contact.primaryPhone}`} className="hover:underline">
                      {formatPhoneNumber(contact.primaryPhone)}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>
                  Last contact:{" "}
                  {contact.lastInteraction
                    ? formatEuropeanDate(contact.lastInteraction.occurredAt, true)
                    : "Never"}
                </span>
                <span>•</span>
                <span>Added: {formatEuropeanDate(contact.createdAt)}</span>
                <span>•</span>
                <span>
                  {contact.interactionCount} interaction{contact.interactionCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center space-x-3">
            {/* Primary actions */}
            <div className="flex space-x-2">
              <Button onClick={() => handleSendEmail(contact)}>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              {contact.primaryPhone && (
                <Button variant="outline" onClick={() => handleCall(contact)}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              )}
              <Button variant="outline" onClick={() => handleScheduleMeeting(contact)}>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            </div>

            {/* More actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Contact
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddNote(contact)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Add Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddTags(contact)}>
                  <Tag className="h-4 w-4 mr-2" />
                  Manage Tags
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExportContact(contact)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Contact
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteContact(contact)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Contact
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* AI Insights Summary */}
        {contact.aiInsights && contact.aiInsights.length > 0 && (
          <div className="mt-6">
            <AIInsightsSummary insights={contact.aiInsights} />
          </div>
        )}
      </div>
    </div>
  );
};
```

### 2.2 Timeline & Interactions

**Interactive Timeline Component:**

```tsx
const InteractionTimeline = ({ interactions, contactId }) => {
  const [filter, setFilter] = useState("all"); // all, email, calls, meetings, notes
  const [sortOrder, setSortOrder] = useState("desc");

  const filteredInteractions = useMemo(() => {
    let filtered = interactions;

    if (filter !== "all") {
      filtered = interactions.filter((interaction) => interaction.type === filter);
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.occurredAt);
      const dateB = new Date(b.occurredAt);
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
  }, [interactions, filter, sortOrder]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Interaction Timeline</span>
            </CardTitle>
            <CardDescription>
              Complete history of all touchpoints and communications
            </CardDescription>
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter tabs */}
            <div className="flex items-center border rounded-lg p-1">
              {[
                { key: "all", label: "All", icon: Activity },
                { key: "email", label: "Email", icon: Mail },
                { key: "call", label: "Calls", icon: Phone },
                { key: "meeting", label: "Meetings", icon: Calendar },
                { key: "note", label: "Notes", icon: FileText },
              ].map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  size="sm"
                  variant={filter === key ? "default" : "ghost"}
                  onClick={() => setFilter(key)}
                  className="h-8"
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {label}
                </Button>
              ))}
            </div>

            {/* Sort order */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            >
              {sortOrder === "desc" ? (
                <ArrowDownWideNarrow className="h-4 w-4" />
              ) : (
                <ArrowUpWideNarrow className="h-4 w-4" />
              )}
            </Button>

            {/* Add interaction */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleAddNote(contactId)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Add Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLogCall(contactId)}>
                  <Phone className="h-4 w-4 mr-2" />
                  Log Call
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLogMeeting(contactId)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Log Meeting
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredInteractions.length === 0 ? (
          <TimelineEmpty filter={filter} onAddFirst={() => handleAddNote(contactId)} />
        ) : (
          <div className="space-y-6">
            {filteredInteractions.map((interaction, index) => (
              <TimelineItem
                key={interaction.id}
                interaction={interaction}
                isLast={index === filteredInteractions.length - 1}
                onEdit={handleEditInteraction}
                onDelete={handleDeleteInteraction}
              />
            ))}

            {/* Load more if paginated */}
            {hasMoreInteractions && (
              <div className="text-center">
                <Button variant="outline" onClick={loadMoreInteractions}>
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

**Timeline Item Component:**

```tsx
const TimelineItem = ({ interaction, isLast, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getInteractionIcon = (type) => {
    switch (type) {
      case "email":
        return Mail;
      case "call":
        return Phone;
      case "meeting":
        return Calendar;
      case "note":
        return FileText;
      default:
        return Activity;
    }
  };

  const getInteractionColor = (type) => {
    switch (type) {
      case "email":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/20";
      case "call":
        return "text-green-600 bg-green-100 dark:bg-green-900/20";
      case "meeting":
        return "text-purple-600 bg-purple-100 dark:bg-purple-900/20";
      case "note":
        return "text-orange-600 bg-orange-100 dark:bg-orange-900/20";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-900/20";
    }
  };

  const Icon = getInteractionIcon(interaction.type);
  const colorClasses = getInteractionColor(interaction.type);

  return (
    <div className="flex space-x-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className={cn("flex items-center justify-center w-10 h-10 rounded-full", colorClasses)}
        >
          <Icon className="h-5 w-5" />
        </div>
        {!isLast && <div className="w-px h-16 bg-border mt-2" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-sm">
                {interaction.subject || getDefaultSubject(interaction.type)}
              </h4>
              <InteractionSourceBadge source={interaction.source} />
            </div>

            {/* Metadata */}
            <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-2">
              <span>{formatEuropeanDate(interaction.occurredAt, true)}</span>
              <span>•</span>
              <span>{formatRelativeTime(interaction.occurredAt)}</span>
              {interaction.source === "gmail" && interaction.sourceMeta?.threadId && (
                <>
                  <span>•</span>
                  <span>Thread: {interaction.sourceMeta.threadId.slice(0, 8)}...</span>
                </>
              )}
            </div>

            {/* Preview */}
            <div className="text-sm text-muted-foreground">
              {interaction.bodyText && (
                <p className={cn("leading-relaxed", !isExpanded && "line-clamp-2")}>
                  {interaction.bodyText}
                </p>
              )}

              {interaction.bodyText && interaction.bodyText.length > 200 && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-xs mt-1"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? "Show less" : "Show more"}
                </Button>
              )}
            </div>

            {/* Attachments or metadata */}
            {interaction.sourceMeta?.attachments && (
              <div className="mt-3">
                <AttachmentList attachments={interaction.sourceMeta.attachments} />
              </div>
            )}
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {interaction.source === "manual" && (
                <DropdownMenuItem onClick={() => onEdit(interaction)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleReplyToInteraction(interaction)}>
                <Reply className="h-4 w-4 mr-2" />
                Reply
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopyLink(interaction)}>
                <Link className="h-4 w-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(interaction)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
```

### 2.3 AI Insights Integration

**AI Insights Section:**

```tsx
const AIInsightsSection = ({ insights, contactId }) => {
  const [selectedInsightType, setSelectedInsightType] = useState("summary");

  const insightsByType = useMemo(() => {
    return insights.reduce((acc, insight) => {
      if (!acc[insight.kind]) acc[insight.kind] = [];
      acc[insight.kind].push(insight);
      return acc;
    }, {});
  }, [insights]);

  const insightTypes = [
    { key: "summary", label: "Summary", icon: FileText },
    { key: "next_step", label: "Next Steps", icon: ArrowRight },
    { key: "risk", label: "Risk Analysis", icon: AlertTriangle },
    { key: "persona", label: "Client Profile", icon: User },
  ];

  if (!insights || insights.length === 0) {
    return (
      <Card className="border-violet-200 dark:border-violet-800">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="rounded-full bg-violet-100 dark:bg-violet-900/20 p-4 w-fit mx-auto">
              <Sparkles className="h-8 w-8 text-violet-600" />
            </div>
            <div>
              <h3 className="font-medium">AI Insights Coming Soon</h3>
              <p className="text-sm text-muted-foreground">
                AI analysis will appear here once there's enough interaction history.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => generateInsights(contactId)}
              className="border-violet-200 text-violet-600 hover:bg-violet-50"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Insights
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-violet-200 dark:border-violet-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              <span>AI Insights</span>
            </CardTitle>
            <CardDescription>
              AI-powered analysis of communication patterns and relationship dynamics
            </CardDescription>
          </div>

          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={() => refreshInsights(contactId)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Insight type tabs */}
        <div className="flex items-center border rounded-lg p-1 w-fit">
          {insightTypes.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              size="sm"
              variant={selectedInsightType === key ? "default" : "ghost"}
              onClick={() => setSelectedInsightType(key)}
              className="h-8"
              disabled={!insightsByType[key]}
            >
              <Icon className="h-3 w-3 mr-1" />
              {label}
              {insightsByType[key] && (
                <Badge variant="secondary" className="ml-2">
                  {insightsByType[key].length}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {insightsByType[selectedInsightType]?.map((insight) => (
            <InsightCard key={insight.id} insight={insight} onFeedback={handleInsightFeedback} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

**Individual Insight Card:**

```tsx
const InsightCard = ({ insight, onFeedback }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const getInsightIcon = (kind) => {
    switch (kind) {
      case "summary":
        return FileText;
      case "next_step":
        return ArrowRight;
      case "risk":
        return AlertTriangle;
      case "persona":
        return User;
      default:
        return Sparkles;
    }
  };

  const getInsightColor = (kind) => {
    switch (kind) {
      case "risk":
        return "text-red-600 bg-red-50 dark:bg-red-950/20";
      case "next_step":
        return "text-blue-600 bg-blue-50 dark:bg-blue-950/20";
      case "persona":
        return "text-purple-600 bg-purple-50 dark:bg-purple-950/20";
      default:
        return "text-violet-600 bg-violet-50 dark:bg-violet-950/20";
    }
  };

  const Icon = getInsightIcon(insight.kind);
  const colorClasses = getInsightColor(insight.kind);

  return (
    <div className="border border-violet-100 dark:border-violet-800 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={cn("p-2 rounded-lg", colorClasses)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-medium text-sm">{formatInsightTitle(insight.kind)}</h4>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>Generated {formatRelativeTime(insight.createdAt)}</span>
              <span>•</span>
              <span>Model: {insight.model}</span>
              <ConfidenceIndicator confidence={insight.confidence} />
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowDetails(!showDetails)}>
              <Eye className="h-4 w-4 mr-2" />
              {showDetails ? "Hide Details" : "Show Details"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCopyInsight(insight)}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Insight
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShareInsight(insight)}>
              <Share className="h-4 w-4 mr-2" />
              Share
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Main content */}
        <div className="text-sm leading-relaxed">
          {insight.content.summary && <p>{insight.content.summary}</p>}

          {insight.content.recommendations && (
            <div className="mt-3">
              <h5 className="font-medium mb-2">Recommendations:</h5>
              <ul className="space-y-1">
                {insight.content.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insight.content.metrics && showDetails && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <h5 className="font-medium mb-2 text-xs">Analysis Details:</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(insight.content.metrics).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{formatMetricLabel(key)}:</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {insight.content.actions && (
          <div className="flex flex-wrap gap-2">
            {insight.content.actions.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant="outline"
                onClick={() => handleInsightAction(action)}
                className="text-xs"
              >
                {getActionIcon(action.type) && (
                  <span className="mr-1">{getActionIcon(action.type)}</span>
                )}
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Feedback */}
        {!feedbackGiven && (
          <div className="flex items-center justify-between pt-2 border-t border-violet-100 dark:border-violet-800">
            <span className="text-xs text-muted-foreground">Was this insight helpful?</span>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleFeedback(insight.id, "positive")}
                className="h-6 px-2"
              >
                <ThumbsUp className="h-3 w-3 mr-1" />
                Yes
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleFeedback(insight.id, "negative")}
                className="h-6 px-2"
              >
                <ThumbsDown className="h-3 w-3 mr-1" />
                No
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const handleFeedback = (insightId, type) => {
    setFeedbackGiven(true);
    onFeedback(insightId, type);
  };
};
```

---

## 3. Contact Creation/Editing Forms

### 3.1 New Contact Creation

**Modal-based Contact Creation:**

```tsx
const NewContactDialog = ({ open, onOpenChange, onContactCreated }) => {
  const [formData, setFormData] = useState({
    displayName: "",
    primaryEmail: "",
    primaryPhone: "",
    notes: "",
    tags: [],
    source: "manual",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};
    if (!formData.displayName.trim()) {
      newErrors.displayName = "Name is required";
    }
    if (formData.primaryEmail && !isValidEmail(formData.primaryEmail)) {
      newErrors.primaryEmail = "Please enter a valid email address";
    }
    if (formData.primaryPhone && !isValidPhone(formData.primaryPhone)) {
      newErrors.primaryPhone = "Please enter a valid phone number";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const contact = await createContact(formData);
      onContactCreated?.(contact);
      onOpenChange(false);

      toast.success("Contact created", {
        description: `${contact.displayName} has been added to your contacts.`,
      });

      // Reset form
      setFormData({
        displayName: "",
        primaryEmail: "",
        primaryPhone: "",
        notes: "",
        tags: [],
        source: "manual",
      });
      setErrors({});
    } catch (error) {
      toast.error("Failed to create contact", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Create a new contact in your CRM system. All fields except name are optional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name field */}
          <div className="space-y-2">
            <Label htmlFor="contact-name" className="text-sm font-medium">
              Full Name *
            </Label>
            <Input
              id="contact-name"
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="Enter full name"
              aria-invalid={errors.displayName ? "true" : "false"}
              aria-describedby={errors.displayName ? "name-error" : "name-help"}
              className={errors.displayName ? "border-destructive" : ""}
              autoFocus
              required
            />
            {errors.displayName && (
              <p id="name-error" className="text-sm text-destructive" role="alert">
                <AlertCircle className="inline h-4 w-4 mr-1" />
                {errors.displayName}
              </p>
            )}
            <p id="name-help" className="text-xs text-muted-foreground">
              This will be the primary display name for the contact
            </p>
          </div>

          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="contact-email" className="text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="contact-email"
              type="email"
              value={formData.primaryEmail}
              onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
              placeholder="email@example.com"
              aria-invalid={errors.primaryEmail ? "true" : "false"}
              aria-describedby={errors.primaryEmail ? "email-error" : "email-help"}
              className={errors.primaryEmail ? "border-destructive" : ""}
            />
            {errors.primaryEmail && (
              <p id="email-error" className="text-sm text-destructive" role="alert">
                <AlertCircle className="inline h-4 w-4 mr-1" />
                {errors.primaryEmail}
              </p>
            )}
            <p id="email-help" className="text-xs text-muted-foreground">
              Primary email for communications and appointments
            </p>
          </div>

          {/* Phone field */}
          <div className="space-y-2">
            <Label htmlFor="contact-phone" className="text-sm font-medium">
              Phone Number
            </Label>
            <Input
              id="contact-phone"
              type="tel"
              value={formData.primaryPhone}
              onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
              placeholder="+44 20 7123 4567"
              aria-invalid={errors.primaryPhone ? "true" : "false"}
              aria-describedby={errors.primaryPhone ? "phone-error" : "phone-help"}
              className={errors.primaryPhone ? "border-destructive" : ""}
            />
            {errors.primaryPhone && (
              <p id="phone-error" className="text-sm text-destructive" role="alert">
                <AlertCircle className="inline h-4 w-4 mr-1" />
                {errors.primaryPhone}
              </p>
            )}
            <p id="phone-help" className="text-xs text-muted-foreground">
              Include country code for international numbers
            </p>
          </div>

          {/* Tags field */}
          <div className="space-y-2">
            <Label htmlFor="contact-tags" className="text-sm font-medium">
              Tags
            </Label>
            <TagInput
              id="contact-tags"
              value={formData.tags}
              onChange={(tags) => setFormData({ ...formData, tags })}
              placeholder="Add tags (press Enter to add)"
              suggestions={tagSuggestions}
            />
            <p className="text-xs text-muted-foreground">
              Use tags to categorize contacts (e.g., "client", "lead", "referral")
            </p>
          </div>

          {/* Notes field */}
          <div className="space-y-2">
            <Label htmlFor="contact-notes" className="text-sm font-medium">
              Initial Notes
            </Label>
            <Textarea
              id="contact-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any initial notes about this contact..."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Optional initial notes or context about the contact
            </p>
          </div>

          {/* Form actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Contact
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

### 3.2 Contact Editing Interface

**Comprehensive Edit Form:**

```tsx
const ContactEditDialog = ({ contactId, open, onOpenChange, onContactUpdated }) => {
  const { contact, loading } = useContact(contactId);
  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when contact loads
  useEffect(() => {
    if (contact) {
      setFormData({
        displayName: contact.displayName || "",
        primaryEmail: contact.primaryEmail || "",
        primaryPhone: contact.primaryPhone || "",
        tags: contact.tags || [],
        notes: contact.notes || "",
        customFields: contact.customFields || {},
      });
    }
  }, [contact]);

  // Track changes
  useEffect(() => {
    if (formData && contact) {
      const hasChanged =
        JSON.stringify(formData) !==
        JSON.stringify({
          displayName: contact.displayName || "",
          primaryEmail: contact.primaryEmail || "",
          primaryPhone: contact.primaryPhone || "",
          tags: contact.tags || [],
          notes: contact.notes || "",
          customFields: contact.customFields || {},
        });
      setHasChanges(hasChanged);
    }
  }, [formData, contact]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasChanges) {
      onOpenChange(false);
      return;
    }

    // Validation
    const newErrors = validateContactForm(formData);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedContact = await updateContact(contactId, formData);
      onContactUpdated?.(updatedContact);
      onOpenChange(false);

      toast.success("Contact updated", {
        description: `${updatedContact.displayName} has been updated successfully.`,
      });
    } catch (error) {
      toast.error("Failed to update contact", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    if (hasChanges) {
      // Show confirmation dialog
      const confirmed = confirm("You have unsaved changes. Are you sure you want to discard them?");
      if (!confirmed) return;
    }
    onOpenChange(false);
  };

  if (loading || !formData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleDiscard}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5" />
            <span>Edit Contact</span>
          </DialogTitle>
          <DialogDescription>
            Update contact information and preferences. Changes are saved immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-medium">
                  Full Name *
                </Label>
                <Input
                  id="edit-name"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Enter full name"
                  aria-invalid={errors.displayName ? "true" : "false"}
                  aria-describedby={errors.displayName ? "edit-name-error" : undefined}
                  className={errors.displayName ? "border-destructive" : ""}
                  required
                />
                {errors.displayName && (
                  <p id="edit-name-error" className="text-sm text-destructive" role="alert">
                    {errors.displayName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.primaryEmail}
                  onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
                  placeholder="email@example.com"
                  aria-invalid={errors.primaryEmail ? "true" : "false"}
                  aria-describedby={errors.primaryEmail ? "edit-email-error" : undefined}
                  className={errors.primaryEmail ? "border-destructive" : ""}
                />
                {errors.primaryEmail && (
                  <p id="edit-email-error" className="text-sm text-destructive" role="alert">
                    {errors.primaryEmail}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="text-sm font-medium">
                  Phone Number
                </Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={formData.primaryPhone}
                  onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                  placeholder="+44 20 7123 4567"
                  aria-invalid={errors.primaryPhone ? "true" : "false"}
                  aria-describedby={errors.primaryPhone ? "edit-phone-error" : undefined}
                  className={errors.primaryPhone ? "border-destructive" : ""}
                />
                {errors.primaryPhone && (
                  <p id="edit-phone-error" className="text-sm text-destructive" role="alert">
                    {errors.primaryPhone}
                  </p>
                )}
              </div>

              {/* Source (readonly) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Source</Label>
                <div className="flex items-center space-x-2">
                  <ContactSourceBadge source={contact.source} />
                  <span className="text-sm text-muted-foreground">
                    Added {formatEuropeanDate(contact.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tags</Label>
            <TagInput
              value={formData.tags}
              onChange={(tags) => setFormData({ ...formData, tags })}
              placeholder="Add tags to categorize this contact"
              suggestions={tagSuggestions}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit-notes" className="text-sm font-medium">
              Notes
            </Label>
            <Textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes about this contact..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Custom Fields */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Custom Fields</h3>
              <Button type="button" size="sm" variant="outline" onClick={addCustomField}>
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>

            {Object.entries(formData.customFields).map(([key, value]) => (
              <CustomFieldEditor
                key={key}
                fieldKey={key}
                value={value}
                onChange={(newKey, newValue) => updateCustomField(key, newKey, newValue)}
                onDelete={() => deleteCustomField(key)}
              />
            ))}
          </div>

          {/* Form Actions */}
          <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
            <div className="flex items-center justify-between w-full">
              {/* Change indicator */}
              <div className="flex items-center space-x-2">
                {hasChanges && (
                  <>
                    <div className="h-2 w-2 bg-amber-500 rounded-full" />
                    <span className="text-sm text-muted-foreground">Unsaved changes</span>
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDiscard}
                  disabled={isSubmitting}
                >
                  {hasChanges ? "Discard" : "Close"}
                </Button>
                <Button type="submit" disabled={isSubmitting || !hasChanges}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 4. AI Integration Components

### 4.1 Chat Assistant Interface

**Floating Chat Panel:**

```tsx
const ContactAIChatPanel = ({ contactId, className }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation history for this contact
  useEffect(() => {
    if (contactId && isExpanded) {
      loadChatHistory(contactId);
    }
  }, [contactId, isExpanded]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: generateId(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await sendChatMessage({
        message: input,
        contactId,
        context: "contact_detail",
        conversationHistory: messages.slice(-10), // Last 10 messages for context
      });

      const assistantMessage = {
        id: generateId(),
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
        confidence: response.confidence,
        suggestions: response.suggestions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        id: generateId(),
        role: "assistant",
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    {
      label: "Summarize relationship",
      prompt: "Can you provide a summary of my relationship with this contact?",
    },
    {
      label: "Suggest next steps",
      prompt: "What would be good next steps for engaging with this contact?",
    },
    {
      label: "Communication patterns",
      prompt: "What are the communication patterns with this contact?",
    },
    {
      label: "Schedule follow-up",
      prompt: "When would be a good time to follow up with this contact?",
    },
  ];

  return (
    <div className={cn("flex flex-col bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <div className="rounded-full bg-violet-100 dark:bg-violet-900/20 p-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <h3 className="font-medium text-sm">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Context-aware help for this contact</p>
          </div>
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 w-8"
        >
          {isExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center space-y-4 py-8">
                <div className="rounded-full bg-violet-100 dark:bg-violet-900/20 p-4 w-fit mx-auto">
                  <Sparkles className="h-8 w-8 text-violet-600" />
                </div>
                <div>
                  <h4 className="font-medium mb-2">AI Assistant Ready</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ask me anything about this contact or get suggestions for your next interaction.
                  </p>
                </div>

                {/* Quick prompts */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Try asking:</p>
                  {quickPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant="outline"
                      onClick={() => setInput(prompt.prompt)}
                      className="w-full text-left justify-start text-xs h-auto py-2"
                    >
                      "{prompt.label}"
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}

                {isTyping && (
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-violet-100 text-violet-600 dark:bg-violet-900/20">
                        <Sparkles className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <TypingIndicator />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about this contact..."
                className="flex-1 min-h-[40px] max-h-32 resize-none"
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isTyping}
                size="icon"
                className="h-10 w-10"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              AI responses are generated based on your contact data.
              <button className="underline ml-1">Privacy info</button>
            </p>
          </div>
        </>
      )}
    </div>
  );
};
```

**Chat Message Component:**

```tsx
const ChatMessage = ({ message }) => {
  const isUser = message.role === "user";
  const isError = message.isError;

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn("flex space-x-3 max-w-[85%]", isUser && "flex-row-reverse space-x-reverse")}
      >
        {!isUser && (
          <Avatar className="h-8 w-8 mt-1">
            <AvatarFallback
              className={cn(
                "text-violet-600",
                isError
                  ? "bg-red-100 text-red-600 dark:bg-red-900/20"
                  : "bg-violet-100 dark:bg-violet-900/20",
              )}
            >
              {isError ? <AlertCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        )}

        <div
          className={cn(
            "rounded-lg px-4 py-2",
            isUser
              ? "bg-primary text-primary-foreground"
              : isError
                ? "bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-800"
                : "bg-muted",
          )}
        >
          <div className="text-sm leading-relaxed">
            {typeof message.content === "string" ? (
              <p>{message.content}</p>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: message.content }} />
            )}
          </div>

          {/* Message metadata */}
          <div
            className={cn(
              "flex items-center justify-between mt-2 text-xs",
              isUser ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            <time>{formatTime(message.timestamp)}</time>

            {!isUser && message.confidence && (
              <ConfidenceIndicator confidence={message.confidence} className="ml-2" />
            )}
          </div>

          {/* Suggestions */}
          {message.suggestions && message.suggestions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-muted space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Suggested actions:</p>
              <div className="flex flex-wrap gap-1">
                {message.suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="outline"
                    onClick={() => handleSuggestion(suggestion)}
                    className="h-6 text-xs"
                  >
                    {getSuggestionIcon(suggestion.type) && (
                      <span className="mr-1">{getSuggestionIcon(suggestion.type)}</span>
                    )}
                    {suggestion.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

---

## 5. Mobile Optimization

### 5.1 Touch-Friendly Design

**Mobile Navigation Bottom Bar:**

```tsx
const MobileBottomNavigation = () => {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: Home, label: "Dashboard" },
    { href: "/contacts", icon: Users, label: "Contacts" },
    { href: "/calendar", icon: Calendar, label: "Calendar" },
    { href: "/messages", icon: Mail, label: "Messages" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center space-y-1 transition-colors",
              "hover:bg-muted focus:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset",
              pathname === item.href ? "text-primary bg-primary/5" : "text-muted-foreground",
            )}
            style={{ minHeight: "64px" }} // Ensure proper touch target
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
            {pathname === item.href && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-primary rounded-full" />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
};
```

**Mobile-Optimized Contact Cards:**

```tsx
const MobileContactCard = ({ contact, onTap, onSwipeActions }) => {
  const swipeRef = useRef(null);

  return (
    <SwipeableCard
      ref={swipeRef}
      leftActions={[
        {
          icon: Mail,
          label: "Email",
          action: () => handleEmail(contact),
          color: "bg-blue-500 text-white",
        },
        {
          icon: Phone,
          label: "Call",
          action: () => handleCall(contact),
          color: "bg-green-500 text-white",
        },
      ]}
      rightActions={[
        {
          icon: Calendar,
          label: "Schedule",
          action: () => handleSchedule(contact),
          color: "bg-purple-500 text-white",
        },
        {
          icon: Trash2,
          label: "Delete",
          action: () => handleDelete(contact),
          color: "bg-red-500 text-white",
        },
      ]}
    >
      <div
        className="p-4 bg-background active:bg-muted/50 transition-colors touch-manipulation"
        onClick={onTap}
        style={{ minHeight: "80px" }} // Adequate touch target
      >
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={contact.avatar} alt={contact.displayName} />
            <AvatarFallback>{getInitials(contact.displayName)}</AvatarFallback>
          </Avatar>

          {/* Contact info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-semibold text-base truncate">{contact.displayName}</h3>
              {contact.hasUnreadMessages && (
                <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0" />
              )}
            </div>

            <p className="text-sm text-muted-foreground truncate">
              {contact.primaryEmail || contact.primaryPhone || "No contact info"}
            </p>

            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {contact.lastInteraction
                  ? `Last: ${formatRelativeTime(contact.lastInteraction.occurredAt)}`
                  : "Never contacted"}
              </span>
              {contact.aiInsight && (
                <AIInsightBadge
                  type={contact.aiInsight.kind}
                  priority={contact.aiInsight.priority}
                  size="xs"
                />
              )}
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex flex-col items-center space-y-1">
            <ContactStatusIndicator status={contact.status} size="sm" />
            {contact.interactionCount > 0 && (
              <span className="text-xs text-muted-foreground">{contact.interactionCount}</span>
            )}
          </div>
        </div>
      </div>
    </SwipeableCard>
  );
};
```

### 5.2 Responsive Layouts

**Mobile-First Contact Detail Layout:**

```tsx
const MobileContactDetail = ({ contactId }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const { contact, loading } = useContactDetails(contactId);

  if (loading) {
    return <MobileContactDetailSkeleton />;
  }

  const tabs = [
    { key: "overview", label: "Overview", icon: User },
    { key: "timeline", label: "Timeline", icon: History },
    { key: "insights", label: "AI Insights", icon: Sparkles },
  ];

  return (
    <div className="lg:hidden flex flex-col h-screen bg-background">
      {/* Mobile header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center p-4">
          <Button size="icon" variant="ghost" onClick={() => history.back()} className="mr-3">
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{contact.displayName}</h1>
            <p className="text-sm text-muted-foreground truncate">{contact.primaryEmail}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(contact)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Contact
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare(contact)}>
                <Share className="h-4 w-4 mr-2" />
                Share Contact
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(contact)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Quick actions */}
        <div className="flex space-x-1 px-4 pb-4">
          <Button
            size="sm"
            onClick={() => handleEmail(contact)}
            className="flex-1"
            disabled={!contact.primaryEmail}
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCall(contact)}
            className="flex-1"
            disabled={!contact.primaryPhone}
          >
            <Phone className="h-4 w-4 mr-2" />
            Call
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSchedule(contact)}
            className="flex-1"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </Button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 flex flex-col items-center py-3 text-sm font-medium transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset",
                activeTab === tab.key
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground",
              )}
              style={{ minHeight: "56px" }} // Touch-friendly height
            >
              <tab.icon className="h-5 w-5 mb-1" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-6">
          {activeTab === "overview" && <MobileContactOverview contact={contact} />}
          {activeTab === "timeline" && <MobileContactTimeline contactId={contactId} />}
          {activeTab === "insights" && <MobileContactInsights contactId={contactId} />}
        </div>
      </div>

      {/* Floating AI Assistant */}
      <FloatingAIButton contactId={contactId} />
    </div>
  );
};
```

---

## 6. Implementation Roadmap & Success Metrics

### 6.1 Phase-by-Phase Implementation

#### **Phase 1: Core Contact Management (Weeks 1-3)**

#### **Week 1: Contact List Foundation**

- [ ] Implement contact list page (`/contacts`) replacing any placeholder content
- [ ] Create contact list header with search, filters, and bulk actions
- [ ] Build individual contact list items with proper touch targets
- [ ] Add mobile swipe actions for quick contact operations
- [ ] Implement basic filtering (source, date range, has email/phone)

#### **Week 2: Contact Details & Forms**

- [ ] Create contact detail page (`/contacts/[id]`) with comprehensive information
- [ ] Implement contact creation dialog with proper validation
- [ ] Build contact editing interface with change tracking
- [ ] Add contact timeline component for interaction history
- [ ] Create mobile-optimized contact detail layout

#### **Week 3: Advanced Features**

- [ ] Add advanced search with AI insights filtering
- [ ] Implement bulk operations (email, delete, tag, export)
- [ ] Create contact import/export functionality
- [ ] Add contact tagging and custom fields system
- [ ] Implement contact merge/duplicate detection

#### **Phase 2: AI Integration (Weeks 4-6)**

#### **Week 4: AI Assistant Foundation**

- [ ] Implement floating AI chat interface
- [ ] Connect to existing `/api/chat` endpoint
- [ ] Create message components with confidence indicators
- [ ] Add contextual suggestions based on contact data
- [ ] Implement chat history persistence

#### **Week 5: AI Insights Display**

- [ ] Build AI insights section for contact details
- [ ] Create insight cards with different types (summary, risk, next_step)
- [ ] Add insight feedback system for model training
- [ ] Implement AI-driven contact recommendations
- [ ] Add confidence indicators and explanation tooltips

#### **Week 6: Advanced AI Features**

- [ ] Create AI-powered contact search and filtering
- [ ] Implement smart follow-up suggestions
- [ ] Add communication pattern analysis
- [ ] Build relationship strength indicators
- [ ] Create AI-assisted contact scoring

#### **Phase 3: Mobile & Polish (Weeks 7-8)**

#### **Week 7: Mobile Optimization**

- [ ] Implement responsive layouts for all contact screens
- [ ] Add mobile bottom navigation
- [ ] Create swipe gestures for list interactions
- [ ] Optimize touch targets for mobile devices
- [ ] Add pull-to-refresh functionality

#### **Week 8: Polish & Performance**

- [ ] Implement virtual scrolling for large contact lists
- [ ] Add comprehensive loading states and skeletons
- [ ] Create smooth animations and transitions
- [ ] Optimize database queries and caching
- [ ] Add comprehensive error handling

### 6.2 Success Metrics & Quality Gates

**Technical Quality Metrics:**

**Performance Targets:**

- Contact list load time: < 1.5 seconds for 1000+ contacts
- Search response time: < 300ms for filtered results
- Mobile interactions: < 100ms response time
- AI chat response: < 5 seconds for insights

**Accessibility Compliance:**

- WCAG 2.1 AA compliance: 100% of components
- Keyboard navigation: Full functionality accessible
- Screen reader compatibility: NVDA/VoiceOver tested
- Color contrast: Minimum 4.5:1 ratio maintained

**Mobile Optimization:**

- Touch targets: Minimum 44px × 44px for all interactive elements
- Responsive breakpoints: 320px, 768px, 1024px, 1440px
- Gesture support: Swipe actions on mobile contact lists
- Loading performance: < 2 seconds on 3G mobile connection

**User Experience Metrics:**

**Task Completion Rates:**

- Contact creation: > 95% success rate
- Contact search/filter: > 90% success rate within 30 seconds
- AI assistant usage: > 60% of users interact with AI features
- Mobile contact management: > 85% success rate

**User Satisfaction Targets:**

- Contact management efficiency: > 4.5/5 user rating
- AI insights usefulness: > 4.2/5 user rating
- Mobile experience quality: > 4.3/5 user rating
- Overall interface intuitiveness: > 4.4/5 user rating

**Business Impact Metrics:**

**Engagement Metrics:**

- Daily active contact views: > 50% of contacts viewed weekly
- AI assistant queries: > 3 per user per day
- Contact interaction logging: > 80% of communications tracked
- Mobile usage: > 40% of interactions on mobile devices

**Efficiency Improvements:**

- Time to find contact: < 15 seconds average
- Contact data entry time: < 2 minutes for new contact
- Follow-up identification: AI suggests 90%+ of due follow-ups
- Communication tracking: 95% of interactions captured automatically

### 6.3 European Standards Compliance

**GDPR Compliance Features:**

- [ ] Consent tracking for AI processing
- [ ] Data export functionality (contact data + interactions)
- [ ] Right to be forgotten implementation
- [ ] Data processing transparency notifications
- [ ] Audit logs for all data access and modifications

**Localization Requirements:**

- [ ] DD/MM/YYYY date formatting throughout
- [ ] European phone number formatting support
- [ ] GDPR-compliant privacy notices
- [ ] Multi-language support framework
- [ ] Currency formatting for European markets

**Data Privacy Controls:**

- [ ] AI processing opt-out mechanisms
- [ ] Data retention policy controls
- [ ] Third-party data sharing controls
- [ ] Encryption status indicators
- [ ] Data location transparency

---

## 7. Integration with Existing Infrastructure

### 7.1 Database Schema Utilization

**Contact Data Model:**

```typescript
// Leverages existing contacts table
interface ContactWithRelations {
  id: string;
  userId: string;
  displayName: string;
  primaryEmail?: string;
  primaryPhone?: string;
  source: "gmail_import" | "manual" | "upload" | "calendar_sync";
  createdAt: Date;
  updatedAt: Date;

  // Related data from other tables
  interactions: Interaction[];
  aiInsights: AiInsight[];
  embeddings: Embedding[];
  tags: string[];
  customFields: Record<string, any>;

  // Computed fields
  lastInteraction?: Interaction;
  interactionCount: number;
  relationshipStrength?: number;
  needsFollowUp?: boolean;
}
```

**AI Integration Points:**

```typescript
// Connects to existing ai_insights table
interface ContactAIInsights {
  summary: AiInsight[]; // kind: 'summary'
  nextSteps: AiInsight[]; // kind: 'next_step'
  riskAnalysis: AiInsight[]; // kind: 'risk'
  persona: AiInsight[]; // kind: 'persona'
}

// Utilizes embeddings table for similarity
interface ContactSimilarity {
  contactId: string;
  similarContacts: {
    id: string;
    displayName: string;
    similarity: number;
    reason: string;
  }[];
}
```

### 7.2 API Integration Points

**Contact CRUD Operations:**

```typescript
// GET /api/contacts - List with filtering and search
// POST /api/contacts - Create new contact
// GET /api/contacts/[id] - Get contact details
// PUT /api/contacts/[id] - Update contact
// DELETE /api/contacts/[id] - Delete contact

// Bulk operations
// POST /api/contacts/bulk/email - Send bulk email
// POST /api/contacts/bulk/tag - Add tags to multiple contacts
// POST /api/contacts/bulk/delete - Delete multiple contacts
// POST /api/contacts/bulk/export - Export contact data
```

**AI Integration Endpoints:**

```typescript
// Leverages existing /api/chat endpoint with contact context
// POST /api/chat - AI assistant with contact context
// POST /api/contacts/[id]/insights - Generate AI insights
// GET /api/contacts/[id]/insights - Retrieve contact insights
// POST /api/contacts/[id]/insights/feedback - Provide insight feedback
```

**Sync Integration:**

```typescript
// Utilizes existing sync infrastructure
// GET /api/contacts/[id]/sync-status - Check sync status
// POST /api/contacts/[id]/sync - Manual sync for contact
// GET /api/contacts/sync/conflicts - Get sync conflicts
// POST /api/contacts/sync/resolve - Resolve sync conflicts
```

### 7.3 Component Architecture Integration

**Design System Compliance:**
All components built using existing shadcn/ui foundation:

- `Button` component with proper variants and accessibility
- `Input`, `Label`, `Textarea` for consistent form styling
- `Card`, `Dialog`, `Sheet` for layout consistency
- `Avatar`, `Badge`, `Tooltip` for UI consistency
- `Skeleton` for loading states throughout

**Theme Integration:**
Utilizes existing CSS custom properties:

```css
/* AI-specific colors building on existing palette */
--ai-primary: oklch(0.569 0.149 293.4); /* Violet for AI features */
--ai-secondary: oklch(0.919 0.024 293.4); /* Light violet background */
--insight-warning: oklch(0.769 0.148 83.3); /* Amber for insights */
--insight-success: oklch(0.629 0.169 145.8); /* Emerald for positive insights */
```

**State Management:**
Integrates with existing patterns:

```typescript
// Uses existing authentication context
const { user } = useAuth();

// Leverages existing data fetching patterns
const { contacts, loading, error } = useSWR(`/api/contacts?userId=${user.id}`, fetcher);

// Follows existing error handling
const handleError = (error) => {
  console.error(error);
  toast.error("Operation failed", {
    description: error.message,
  });
};
```

---

## Conclusion

This comprehensive contact management system specification provides a complete roadmap for transforming OmniCRM into a production-ready AI-driven CRM platform. The design leverages the excellent existing database schema and infrastructure while addressing all critical UI/UX issues identified in the audit.

### Key Success Factors

**1. Foundation Leverage:**

- Utilizes robust existing database schema (contacts, interactions, ai_insights, embeddings)
- Builds upon proven shadcn/ui design system with accessibility built-in
- Integrates seamlessly with existing Google sync infrastructure

**2. User Experience Excellence:**

- Comprehensive contact list with advanced filtering and bulk operations
- Detailed contact timelines with AI insights integration
- Mobile-first responsive design with touch-optimized interactions
- Consistent European date formatting and GDPR compliance

**3. AI Integration:**

- Context-aware AI assistant for contact-specific insights
- Smart recommendations based on interaction patterns
- Confidence indicators and user feedback loops
- Privacy-conscious AI processing with opt-out controls

**4. Accessibility & Performance:**

- WCAG 2.1 AA compliance throughout
- Virtual scrolling for large contact lists
- Comprehensive loading states and error handling
- Mobile optimization with proper touch targets

### Implementation Priority

**Week 1-3: Core Foundation**
Replace all placeholder content with functional contact management interface, ensuring basic CRUD operations and mobile responsiveness.

**Week 4-6: AI Integration**
Implement AI assistant and insights display, connecting to existing backend infrastructure for intelligent contact analysis.

**Week 7-8: Polish & Optimization**
Add advanced features, animations, and performance optimizations to create a polished production experience.

This specification serves as the definitive guide for creating a world-class contact management system that wellness practitioners will find both powerful and delightful to use, fully leveraging OmniCRM's sophisticated technical foundation.
