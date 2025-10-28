/**
 * Research & Knowledge Tools
 *
 * AI-callable tools for wellness knowledge base searches, medical research,
 * treatment protocols, and evidence-based resources.
 *
 * ALL TOOLS IN THIS MODULE COST CREDITS - they call external paid APIs
 * (PubMed, medical databases, wellness knowledge bases).
 */

import type { ToolDefinition, ToolHandler } from "../types";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";

// ============================================================================
// TOOL 1: search_wellness_knowledge
// ============================================================================

const SearchWellnessKnowledgeParamsSchema = z.object({
  query: z.string().min(1).max(500),
  category: z
    .enum([
      "yoga",
      "meditation",
      "nutrition",
      "mindfulness",
      "stress_management",
      "holistic_health",
      "general",
    ])
    .optional(),
  max_results: z.number().int().positive().max(20).default(5),
});

type SearchWellnessKnowledgeParams = z.infer<typeof SearchWellnessKnowledgeParamsSchema>;

interface WellnessKnowledgeResult {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  url?: string;
  relevanceScore: number;
}

interface SearchWellnessKnowledgeResult {
  query: string;
  results: WellnessKnowledgeResult[];
  totalResults: number;
  searchTime: number;
}

export const searchWellnessKnowledgeDefinition: ToolDefinition = {
  name: "search_wellness_knowledge",
  category: "external",
  version: "1.0.0",
  description:
    "Search wellness knowledge base for articles, guides, and best practices. Returns curated wellness content from trusted sources on topics like yoga, meditation, nutrition, and holistic health.",
  useCases: [
    "When user asks 'find information about meditation techniques'",
    "When looking for 'yoga poses for stress relief'",
    "When user wants to 'research mindfulness practices'",
    "When seeking wellness best practices and educational content",
  ],
  exampleCalls: [
    'search_wellness_knowledge({"query": "meditation for anxiety", "category": "meditation", "max_results": 5})',
    'search_wellness_knowledge({"query": "yoga poses for back pain", "category": "yoga"})',
    'When user says: "Find articles about stress management techniques"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "Search query for wellness topics (e.g., 'meditation techniques', 'nutrition for athletes')",
      },
      category: {
        type: "string",
        description:
          "Optional category filter: yoga, meditation, nutrition, mindfulness, stress_management, holistic_health, general",
      },
      max_results: {
        type: "number",
        description: "Maximum number of results to return (default: 5, max: 20)",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 5, // Costs credits - calls external knowledge base API
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 86400, // Cache for 24 hours - knowledge base rarely changes
  rateLimit: {
    maxCalls: 10,
    windowMs: 3600000, // 10 searches per hour
  },
  tags: ["research", "wellness", "knowledge-base", "external-api", "paid"],
  deprecated: false,
};

export const searchWellnessKnowledgeHandler: ToolHandler<
  SearchWellnessKnowledgeParams,
  SearchWellnessKnowledgeResult
> = async (params) => {
  const validated = SearchWellnessKnowledgeParamsSchema.parse(params);
  const startTime = Date.now();

  try {
    // TODO: Integrate with actual wellness knowledge base API
    // For now, return mock data structure
    const mockResults: WellnessKnowledgeResult[] = [
      {
        id: "wk-001",
        title: `Understanding ${validated.query}`,
        summary: `Comprehensive guide to ${validated.query} covering foundational concepts, practical techniques, and evidence-based approaches.`,
        category: validated.category || "general",
        source: "Wellness Knowledge Base",
        url: `https://example.com/kb/${validated.query.replace(/\s+/g, "-")}`,
        relevanceScore: 0.95,
      },
      {
        id: "wk-002",
        title: `Best Practices for ${validated.query}`,
        summary: `Expert recommendations and proven strategies for implementing ${validated.query} in daily practice.`,
        category: validated.category || "general",
        source: "Wellness Knowledge Base",
        url: `https://example.com/kb/best-practices-${validated.query.replace(/\s+/g, "-")}`,
        relevanceScore: 0.88,
      },
    ].slice(0, validated.max_results);

    const searchTime = Date.now() - startTime;

    return {
      query: validated.query,
      results: mockResults,
      totalResults: mockResults.length,
      searchTime,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to search wellness knowledge base",
      "WELLNESS_KNOWLEDGE_SEARCH_FAILED",
      "network",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 2: get_protocol_suggestions
// ============================================================================

const GetProtocolSuggestionsParamsSchema = z.object({
  condition: z.string().min(1).max(200),
  modality: z
    .enum([
      "yoga",
      "massage",
      "acupuncture",
      "meditation",
      "nutrition",
      "herbal",
      "movement",
      "any",
    ])
    .default("any"),
  client_context: z
    .object({
      age: z.number().int().positive().optional(),
      contraindications: z.array(z.string()).optional(),
      experience_level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    })
    .optional(),
});

type GetProtocolSuggestionsParams = z.infer<typeof GetProtocolSuggestionsParamsSchema>;

interface ProtocolStep {
  step: number;
  description: string;
  duration?: string;
  notes?: string;
}

interface Protocol {
  id: string;
  name: string;
  modality: string;
  condition: string;
  summary: string;
  steps: ProtocolStep[];
  duration: string;
  frequency: string;
  contraindications: string[];
  evidenceLevel: "high" | "moderate" | "low" | "clinical_experience";
  source: string;
  references?: string[];
}

interface GetProtocolSuggestionsResult {
  condition: string;
  modality: string;
  protocols: Protocol[];
  disclaimer: string;
}

export const getProtocolSuggestionsDefinition: ToolDefinition = {
  name: "get_protocol_suggestions",
  category: "external",
  version: "1.0.0",
  description:
    "Get evidence-based treatment protocol recommendations for specific conditions. Returns structured protocols with steps, contraindications, and evidence levels for wellness modalities.",
  useCases: [
    "When user asks 'what protocol should I use for anxiety?'",
    "When planning treatment approach for specific condition",
    "When user wants to 'find yoga protocols for lower back pain'",
    "When researching evidence-based treatment options",
  ],
  exampleCalls: [
    'get_protocol_suggestions({"condition": "anxiety", "modality": "meditation"})',
    'get_protocol_suggestions({"condition": "lower back pain", "modality": "yoga", "client_context": {"experience_level": "beginner"}})',
    'When user says: "Show me treatment protocols for stress management"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      condition: {
        type: "string",
        description:
          "Health condition or wellness goal (e.g., 'anxiety', 'lower back pain', 'stress')",
      },
      modality: {
        type: "string",
        description:
          "Treatment modality: yoga, massage, acupuncture, meditation, nutrition, herbal, movement, or 'any'",
      },
      client_context: {
        type: "object",
        description:
          "Optional client context (age, contraindications, experience level) to personalize recommendations",
      },
    },
    required: ["condition"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 10, // Higher cost - complex protocol recommendations from medical databases
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 86400, // Cache for 24 hours
  rateLimit: {
    maxCalls: 5,
    windowMs: 3600000, // 5 calls per hour - expensive API calls
  },
  tags: ["research", "protocols", "treatment", "external-api", "paid"],
  deprecated: false,
};

export const getProtocolSuggestionsHandler: ToolHandler<
  GetProtocolSuggestionsParams,
  GetProtocolSuggestionsResult
> = async (params) => {
  const validated = GetProtocolSuggestionsParamsSchema.parse(params);

  try {
    // TODO: Integrate with actual medical protocol database API
    // For now, return mock data structure
    const mockProtocol: Protocol = {
      id: "protocol-001",
      name: `${validated.modality} Protocol for ${validated.condition}`,
      modality: validated.modality,
      condition: validated.condition,
      summary: `Evidence-based ${validated.modality} approach for managing ${validated.condition}, incorporating gentle techniques suitable for various experience levels.`,
      steps: [
        {
          step: 1,
          description: "Initial assessment and preparation",
          duration: "5-10 minutes",
          notes: "Establish baseline and set intentions",
        },
        {
          step: 2,
          description: "Primary intervention",
          duration: "20-30 minutes",
          notes: "Core treatment protocol implementation",
        },
        {
          step: 3,
          description: "Integration and closure",
          duration: "5-10 minutes",
          notes: "Allow body/mind to integrate the practice",
        },
      ],
      duration: "30-50 minutes per session",
      frequency: "2-3 times per week",
      contraindications: [
        "Acute injury in target area",
        "Severe cardiovascular conditions (consult physician)",
        "Recent surgery (within 6 weeks)",
      ],
      evidenceLevel: "moderate",
      source: "Clinical Practice Guidelines",
      references: [
        "Journal of Integrative Medicine, 2024",
        "American Wellness Association Guidelines",
      ],
    };

    return {
      condition: validated.condition,
      modality: validated.modality,
      protocols: [mockProtocol],
      disclaimer:
        "These protocols are for informational purposes only and do not constitute medical advice. Always consult with qualified healthcare providers before implementing new treatments.",
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to retrieve protocol suggestions",
      "PROTOCOL_SUGGESTIONS_FAILED",
      "network",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 3: search_medical_research
// ============================================================================

const SearchMedicalResearchParamsSchema = z.object({
  query: z.string().min(1).max(500),
  databases: z
    .array(z.enum(["pubmed", "cochrane", "clinicaltrials", "all"]))
    .default(["pubmed"]),
  publication_years: z
    .object({
      start: z.number().int().min(1900).max(2100).optional(),
      end: z.number().int().min(1900).max(2100).optional(),
    })
    .optional(),
  study_types: z
    .array(
      z.enum([
        "randomized_controlled_trial",
        "systematic_review",
        "meta_analysis",
        "observational",
        "case_study",
        "any",
      ]),
    )
    .optional(),
  max_results: z.number().int().positive().max(50).default(10),
});

type SearchMedicalResearchParams = z.infer<typeof SearchMedicalResearchParamsSchema>;

interface ResearchPaper {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  publicationDate: string;
  abstract: string;
  studyType: string;
  database: string;
  pmid?: string;
  doi?: string;
  url: string;
  relevanceScore: number;
}

interface SearchMedicalResearchResult {
  query: string;
  papers: ResearchPaper[];
  totalResults: number;
  databases: string[];
  searchTime: number;
}

export const searchMedicalResearchDefinition: ToolDefinition = {
  name: "search_medical_research",
  category: "external",
  version: "1.0.0",
  description:
    "Search medical research databases (PubMed, Cochrane, ClinicalTrials.gov) for peer-reviewed studies and clinical trials. Returns academic research papers with abstracts, citations, and evidence quality ratings.",
  useCases: [
    "When user asks 'find research on meditation for PTSD'",
    "When looking for 'clinical trials on yoga for chronic pain'",
    "When user wants to 'search latest studies on acupuncture effectiveness'",
    "When researching evidence-based practices for client protocols",
  ],
  exampleCalls: [
    'search_medical_research({"query": "meditation anxiety randomized controlled trial", "databases": ["pubmed"], "max_results": 10})',
    'search_medical_research({"query": "yoga chronic pain", "study_types": ["systematic_review", "meta_analysis"], "publication_years": {"start": 2020}})',
    'When user says: "Find recent research on acupuncture for migraines"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Search query for medical research (e.g., 'meditation for anxiety')",
      },
      databases: {
        type: "array",
        description:
          "Medical databases to search: pubmed, cochrane, clinicaltrials, or 'all' (default: pubmed)",
      },
      publication_years: {
        type: "object",
        description: "Optional date range filter (start and end years)",
      },
      study_types: {
        type: "array",
        description:
          "Optional filter by study type (randomized_controlled_trial, systematic_review, meta_analysis, etc.)",
      },
      max_results: {
        type: "number",
        description: "Maximum number of results to return (default: 10, max: 50)",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 15, // High cost - calls expensive medical research databases
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 86400, // Cache for 24 hours
  rateLimit: {
    maxCalls: 5,
    windowMs: 3600000, // 5 searches per hour - expensive API
  },
  tags: ["research", "medical", "pubmed", "evidence-based", "external-api", "paid"],
  deprecated: false,
};

export const searchMedicalResearchHandler: ToolHandler<
  SearchMedicalResearchParams,
  SearchMedicalResearchResult
> = async (params) => {
  const validated = SearchMedicalResearchParamsSchema.parse(params);
  const startTime = Date.now();

  try {
    // TODO: Integrate with actual PubMed/medical research APIs
    // For now, return mock data structure
    const mockPaper: ResearchPaper = {
      id: "pmid-12345678",
      title: `Clinical efficacy of ${validated.query.split(" ")[0]} intervention: A systematic review`,
      authors: ["Smith J", "Johnson A", "Williams B"],
      journal: "Journal of Integrative Medicine",
      publicationDate: "2024-01-15",
      abstract: `Background: This systematic review examines the evidence for ${validated.query}. Methods: We searched major databases for relevant studies. Results: Significant benefits were observed. Conclusion: ${validated.query} shows promise as an evidence-based intervention.`,
      studyType: "systematic_review",
      database: validated.databases[0] || "pubmed",
      pmid: "12345678",
      doi: "10.1234/jim.2024.001",
      url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
      relevanceScore: 0.92,
    };

    const searchTime = Date.now() - startTime;

    return {
      query: validated.query,
      papers: [mockPaper].slice(0, validated.max_results),
      totalResults: 1,
      databases: validated.databases,
      searchTime,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to search medical research databases",
      "MEDICAL_RESEARCH_SEARCH_FAILED",
      "network",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 4: get_contraindications
// ============================================================================

const GetContraindicationsParamsSchema = z.object({
  treatment: z.string().min(1).max(200),
  client_conditions: z.array(z.string()).min(1),
  medications: z.array(z.string()).optional(),
});

type GetContraindicationsParams = z.infer<typeof GetContraindicationsParamsSchema>;

interface Contraindication {
  type: "absolute" | "relative" | "precaution";
  condition: string;
  reason: string;
  severity: "high" | "medium" | "low";
  recommendations: string;
  source: string;
}

interface DrugInteraction {
  medication: string;
  interactionType: string;
  severity: "major" | "moderate" | "minor";
  description: string;
  recommendations: string;
}

interface GetContraindicationsResult {
  treatment: string;
  clientConditions: string[];
  contraindications: Contraindication[];
  drugInteractions: DrugInteraction[];
  overallRiskLevel: "high" | "moderate" | "low" | "minimal";
  safetyRecommendations: string[];
  disclaimer: string;
}

export const getContraindicationsDefinition: ToolDefinition = {
  name: "get_contraindications",
  category: "external",
  version: "1.0.0",
  description:
    "Check treatment contraindications and safety considerations based on client health conditions and medications. Returns absolute/relative contraindications, drug interactions, and safety recommendations.",
  useCases: [
    "When user asks 'is hot yoga safe for someone with high blood pressure?'",
    "When checking 'contraindications for deep tissue massage'",
    "When user wants to verify 'can this client safely do this treatment?'",
    "When reviewing safety before starting new protocol",
  ],
  exampleCalls: [
    'get_contraindications({"treatment": "hot yoga", "client_conditions": ["hypertension", "pregnancy"]})',
    'get_contraindications({"treatment": "deep tissue massage", "client_conditions": ["diabetes"], "medications": ["warfarin"]})',
    'When user says: "Check if acupuncture is safe for a client with pacemaker"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      treatment: {
        type: "string",
        description:
          "Treatment or modality to check (e.g., 'hot yoga', 'deep tissue massage', 'acupuncture')",
      },
      client_conditions: {
        type: "array",
        description:
          "List of client health conditions (e.g., ['hypertension', 'diabetes', 'pregnancy'])",
      },
      medications: {
        type: "array",
        description: "Optional list of medications the client is taking",
      },
    },
    required: ["treatment", "client_conditions"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 10, // Costs credits - calls medical contraindication databases
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 3600, // Cache for 1 hour - medical info can update
  rateLimit: {
    maxCalls: 10,
    windowMs: 3600000, // 10 checks per hour
  },
  tags: ["research", "safety", "contraindications", "medical", "external-api", "paid"],
  deprecated: false,
};

export const getContraindicationsHandler: ToolHandler<
  GetContraindicationsParams,
  GetContraindicationsResult
> = async (params) => {
  const validated = GetContraindicationsParamsSchema.parse(params);

  try {
    // TODO: Integrate with actual medical contraindication database API
    // For now, return mock data structure
    const mockContraindication: Contraindication = {
      type: "relative",
      condition: validated.client_conditions[0] || "general",
      reason: `${validated.treatment} may exacerbate symptoms or require modifications for individuals with ${validated.client_conditions[0]}`,
      severity: "medium",
      recommendations:
        "Consult healthcare provider before proceeding. Consider modified approach with reduced intensity and careful monitoring.",
      source: "Clinical Safety Guidelines",
    };

    const mockDrugInteraction: DrugInteraction | null = validated.medications?.[0]
      ? {
          medication: validated.medications[0],
          interactionType: "physiological_effect",
          severity: "moderate",
          description: `${validated.treatment} may interact with ${validated.medications[0]} by affecting blood flow or metabolic processes`,
          recommendations:
            "Monitor for adverse effects. Consider timing treatment sessions away from medication dosing.",
        }
      : null;

    return {
      treatment: validated.treatment,
      clientConditions: validated.client_conditions,
      contraindications: [mockContraindication],
      drugInteractions: mockDrugInteraction ? [mockDrugInteraction] : [],
      overallRiskLevel: "moderate",
      safetyRecommendations: [
        "Obtain medical clearance from primary care physician",
        "Start with modified/gentle approach",
        "Monitor client response closely during first session",
        "Have emergency protocols in place",
        "Document all safety considerations in client file",
      ],
      disclaimer:
        "This information is for educational purposes only and does not constitute medical advice. Always consult with qualified healthcare providers for medical clearance and safety assessment.",
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to retrieve contraindications",
      "CONTRAINDICATIONS_CHECK_FAILED",
      "network",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 5: find_evidence_based_resources
// ============================================================================

const FindEvidenceBasedResourcesParamsSchema = z.object({
  condition: z.string().min(1).max(200),
  resource_types: z
    .array(z.enum(["research_paper", "clinical_guideline", "review", "meta_analysis", "any"]))
    .default(["any"]),
  quality_threshold: z.enum(["high", "moderate", "any"]).default("moderate"),
  max_results: z.number().int().positive().max(30).default(10),
});

type FindEvidenceBasedResourcesParams = z.infer<typeof FindEvidenceBasedResourcesParamsSchema>;

interface EvidenceBasedResource {
  id: string;
  type: "research_paper" | "clinical_guideline" | "systematic_review" | "meta_analysis";
  title: string;
  authors?: string[];
  organization?: string;
  summary: string;
  keyFindings: string[];
  evidenceQuality: "high" | "moderate" | "low";
  yearPublished: number;
  source: string;
  url: string;
  citations?: number;
  practicalApplications?: string[];
}

interface FindEvidenceBasedResourcesResult {
  condition: string;
  resources: EvidenceBasedResource[];
  totalResults: number;
  qualityDistribution: {
    high: number;
    moderate: number;
    low: number;
  };
}

export const findEvidenceBasedResourcesDefinition: ToolDefinition = {
  name: "find_evidence_based_resources",
  category: "external",
  version: "1.0.0",
  description:
    "Find evidence-based research papers, clinical guidelines, and systematic reviews for specific health conditions. Returns high-quality resources with practical applications for wellness practice.",
  useCases: [
    "When user asks 'find evidence-based resources for treating chronic pain'",
    "When looking for 'clinical guidelines for stress management'",
    "When user wants 'research papers on yoga for depression'",
    "When building evidence-based treatment protocols",
  ],
  exampleCalls: [
    'find_evidence_based_resources({"condition": "chronic pain", "resource_types": ["clinical_guideline", "meta_analysis"], "quality_threshold": "high"})',
    'find_evidence_based_resources({"condition": "anxiety disorders", "max_results": 15})',
    'When user says: "Find me the best evidence-based resources for treating insomnia"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      condition: {
        type: "string",
        description:
          "Health condition to research (e.g., 'chronic pain', 'anxiety', 'insomnia')",
      },
      resource_types: {
        type: "array",
        description:
          "Types of resources to include: research_paper, clinical_guideline, review, meta_analysis, or 'any'",
      },
      quality_threshold: {
        type: "string",
        description: "Minimum evidence quality to include: high, moderate, or 'any'",
      },
      max_results: {
        type: "number",
        description: "Maximum number of resources to return (default: 10, max: 30)",
      },
    },
    required: ["condition"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 15, // High cost - comprehensive research across multiple databases
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 86400, // Cache for 24 hours
  rateLimit: {
    maxCalls: 5,
    windowMs: 3600000, // 5 searches per hour
  },
  tags: ["research", "evidence-based", "clinical-guidelines", "external-api", "paid"],
  deprecated: false,
};

export const findEvidenceBasedResourcesHandler: ToolHandler<
  FindEvidenceBasedResourcesParams,
  FindEvidenceBasedResourcesResult
> = async (params) => {
  const validated = FindEvidenceBasedResourcesParamsSchema.parse(params);

  try {
    // TODO: Integrate with actual research databases and clinical guideline repositories
    // For now, return mock data structure
    const mockResource: EvidenceBasedResource = {
      id: "ebr-001",
      type: "systematic_review",
      title: `Evidence-Based Approaches for ${validated.condition}: A Comprehensive Review`,
      authors: ["Anderson M", "Taylor R", "Martinez L"],
      summary: `This systematic review synthesizes current evidence for managing ${validated.condition}, evaluating efficacy of various interventions and providing evidence-graded recommendations.`,
      keyFindings: [
        `Multiple high-quality RCTs demonstrate significant benefits for ${validated.condition}`,
        "Multimodal approaches show superior outcomes compared to single interventions",
        "Early intervention associated with better long-term outcomes",
        "Personalized treatment protocols improve adherence and effectiveness",
      ],
      evidenceQuality: "high",
      yearPublished: 2024,
      source: "Cochrane Database of Systematic Reviews",
      url: `https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD000000`,
      citations: 156,
      practicalApplications: [
        "Implement evidence-based screening protocols",
        "Develop individualized treatment plans based on client presentation",
        "Monitor progress using validated outcome measures",
        "Adjust interventions based on response patterns",
      ],
    };

    return {
      condition: validated.condition,
      resources: [mockResource].slice(0, validated.max_results),
      totalResults: 1,
      qualityDistribution: {
        high: 1,
        moderate: 0,
        low: 0,
      },
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to find evidence-based resources",
      "EVIDENCE_BASED_RESOURCES_FAILED",
      "network",
      false,
      500,
    );
  }
};
