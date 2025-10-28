/**
 * Tests for Research & Knowledge Tools
 */

import { describe, it, expect, vi } from "vitest";
import {
  searchWellnessKnowledgeDefinition,
  searchWellnessKnowledgeHandler,
  getProtocolSuggestionsDefinition,
  getProtocolSuggestionsHandler,
  searchMedicalResearchDefinition,
  searchMedicalResearchHandler,
  getContraindicationsDefinition,
  getContraindicationsHandler,
  findEvidenceBasedResourcesDefinition,
  findEvidenceBasedResourcesHandler,
} from "../research";
import type { ToolExecutionContext } from "../../types";

const mockContext: ToolExecutionContext = {
  userId: "test-user-id",
  timestamp: new Date("2025-01-15T12:00:00Z"),
  requestId: "test-request-id",
};

describe("Research & Knowledge Tools - Definitions", () => {
  describe("search_wellness_knowledge", () => {
    it("should have correct metadata", () => {
      expect(searchWellnessKnowledgeDefinition.name).toBe("search_wellness_knowledge");
      expect(searchWellnessKnowledgeDefinition.category).toBe("external");
      expect(searchWellnessKnowledgeDefinition.permissionLevel).toBe("read");
      expect(searchWellnessKnowledgeDefinition.creditCost).toBe(5);
      expect(searchWellnessKnowledgeDefinition.isIdempotent).toBe(true);
      expect(searchWellnessKnowledgeDefinition.cacheable).toBe(true);
    });

    it("should have rate limiting configured", () => {
      expect(searchWellnessKnowledgeDefinition.rateLimit).toBeDefined();
      expect(searchWellnessKnowledgeDefinition.rateLimit?.maxCalls).toBe(10);
      expect(searchWellnessKnowledgeDefinition.rateLimit?.windowMs).toBe(3600000);
    });
  });

  describe("get_protocol_suggestions", () => {
    it("should have correct metadata", () => {
      expect(getProtocolSuggestionsDefinition.name).toBe("get_protocol_suggestions");
      expect(getProtocolSuggestionsDefinition.category).toBe("external");
      expect(getProtocolSuggestionsDefinition.permissionLevel).toBe("read");
      expect(getProtocolSuggestionsDefinition.creditCost).toBe(10);
      expect(getProtocolSuggestionsDefinition.isIdempotent).toBe(true);
    });
  });

  describe("search_medical_research", () => {
    it("should have correct metadata", () => {
      expect(searchMedicalResearchDefinition.name).toBe("search_medical_research");
      expect(searchMedicalResearchDefinition.category).toBe("external");
      expect(searchMedicalResearchDefinition.permissionLevel).toBe("read");
      expect(searchMedicalResearchDefinition.creditCost).toBe(15);
      expect(searchMedicalResearchDefinition.isIdempotent).toBe(true);
    });
  });

  describe("get_contraindications", () => {
    it("should have correct metadata", () => {
      expect(getContraindicationsDefinition.name).toBe("get_contraindications");
      expect(getContraindicationsDefinition.category).toBe("external");
      expect(getContraindicationsDefinition.permissionLevel).toBe("read");
      expect(getContraindicationsDefinition.creditCost).toBe(10);
      expect(getContraindicationsDefinition.isIdempotent).toBe(true);
    });
  });

  describe("find_evidence_based_resources", () => {
    it("should have correct metadata", () => {
      expect(findEvidenceBasedResourcesDefinition.name).toBe("find_evidence_based_resources");
      expect(findEvidenceBasedResourcesDefinition.category).toBe("external");
      expect(findEvidenceBasedResourcesDefinition.permissionLevel).toBe("read");
      expect(findEvidenceBasedResourcesDefinition.creditCost).toBe(15);
      expect(findEvidenceBasedResourcesDefinition.isIdempotent).toBe(true);
    });
  });
});

describe("Research & Knowledge Tools - Handlers", () => {
  describe("search_wellness_knowledge", () => {
    it("should search wellness knowledge base successfully", async () => {
      const result = await searchWellnessKnowledgeHandler(
        {
          query: "meditation for anxiety",
          category: "meditation",
          max_results: 5,
        },
        mockContext,
      );

      expect(result.query).toBe("meditation for anxiety");
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.totalResults).toBeGreaterThanOrEqual(0);
      expect(result.searchTime).toBeGreaterThanOrEqual(0);
    });

    it("should return results with correct structure", async () => {
      const result = await searchWellnessKnowledgeHandler(
        {
          query: "yoga poses",
          max_results: 3,
        },
        mockContext,
      );

      if (result.results.length > 0) {
        const firstResult = result.results[0];
        expect(firstResult).toBeDefined();
        if (firstResult) {
          expect(firstResult.id).toBeDefined();
          expect(firstResult.title).toBeDefined();
          expect(firstResult.summary).toBeDefined();
          expect(firstResult.relevanceScore).toBeDefined();
        }
      }
    });

    it("should respect max_results parameter", async () => {
      const maxResults = 3;
      const result = await searchWellnessKnowledgeHandler(
        {
          query: "mindfulness",
          max_results: maxResults,
        },
        mockContext,
      );

      expect(result.results.length).toBeLessThanOrEqual(maxResults);
    });

    it("should reject invalid query", async () => {
      await expect(
        searchWellnessKnowledgeHandler(
          {
            query: "",
            max_results: 5,
          },
          mockContext,
        ),
      ).rejects.toThrow();
    });
  });

  describe("get_protocol_suggestions", () => {
    it("should get protocol suggestions successfully", async () => {
      const result = await getProtocolSuggestionsHandler(
        {
          condition: "anxiety",
          modality: "meditation",
        },
        mockContext,
      );

      expect(result.condition).toBe("anxiety");
      expect(result.modality).toBe("meditation");
      expect(result.protocols).toBeDefined();
      expect(Array.isArray(result.protocols)).toBe(true);
      expect(result.disclaimer).toBeDefined();
    });

    it("should return protocols with correct structure", async () => {
      const result = await getProtocolSuggestionsHandler(
        {
          condition: "lower back pain",
          modality: "yoga",
        },
        mockContext,
      );

      if (result.protocols.length > 0) {
        const protocol = result.protocols[0];
        expect(protocol).toBeDefined();
        if (protocol) {
          expect(protocol.id).toBeDefined();
          expect(protocol.name).toBeDefined();
          expect(protocol.steps).toBeDefined();
          expect(Array.isArray(protocol.steps)).toBe(true);
          expect(protocol.contraindications).toBeDefined();
          expect(protocol.evidenceLevel).toBeDefined();
        }
      }
    });

    it("should handle client context", async () => {
      const result = await getProtocolSuggestionsHandler(
        {
          condition: "stress",
          modality: "yoga",
          client_context: {
            age: 45,
            experience_level: "beginner",
            contraindications: ["high blood pressure"],
          },
        },
        mockContext,
      );

      expect(result.protocols).toBeDefined();
    });
  });

  describe("search_medical_research", () => {
    it("should search medical research successfully", async () => {
      const result = await searchMedicalResearchHandler(
        {
          query: "meditation anxiety",
          databases: ["pubmed"],
          max_results: 10,
        },
        mockContext,
      );

      expect(result.query).toBe("meditation anxiety");
      expect(result.papers).toBeDefined();
      expect(Array.isArray(result.papers)).toBe(true);
      expect(result.databases).toEqual(["pubmed"]);
      expect(result.searchTime).toBeGreaterThanOrEqual(0);
    });

    it("should return papers with correct structure", async () => {
      const result = await searchMedicalResearchHandler(
        {
          query: "yoga chronic pain",
          databases: ["pubmed"],
          max_results: 5,
        },
        mockContext,
      );

      if (result.papers.length > 0) {
        const paper = result.papers[0];
        expect(paper).toBeDefined();
        if (paper) {
          expect(paper.id).toBeDefined();
          expect(paper.title).toBeDefined();
          expect(paper.abstract).toBeDefined();
          expect(paper.authors).toBeDefined();
          expect(Array.isArray(paper.authors)).toBe(true);
          expect(paper.studyType).toBeDefined();
        }
      }
    });

    it("should handle publication year filters", async () => {
      const result = await searchMedicalResearchHandler(
        {
          query: "acupuncture",
          databases: ["pubmed"],
          publication_years: {
            start: 2020,
            end: 2024,
          },
          max_results: 5,
        },
        mockContext,
      );

      expect(result.papers).toBeDefined();
    });

    it("should handle study type filters", async () => {
      const result = await searchMedicalResearchHandler(
        {
          query: "mindfulness stress",
          databases: ["pubmed"],
          study_types: ["randomized_controlled_trial", "meta_analysis"],
          max_results: 5,
        },
        mockContext,
      );

      expect(result.papers).toBeDefined();
    });
  });

  describe("get_contraindications", () => {
    it("should check contraindications successfully", async () => {
      const result = await getContraindicationsHandler(
        {
          treatment: "hot yoga",
          client_conditions: ["hypertension"],
        },
        mockContext,
      );

      expect(result.treatment).toBe("hot yoga");
      expect(result.clientConditions).toEqual(["hypertension"]);
      expect(result.contraindications).toBeDefined();
      expect(Array.isArray(result.contraindications)).toBe(true);
      expect(result.overallRiskLevel).toBeDefined();
      expect(result.safetyRecommendations).toBeDefined();
      expect(result.disclaimer).toBeDefined();
    });

    it("should return contraindications with correct structure", async () => {
      const result = await getContraindicationsHandler(
        {
          treatment: "deep tissue massage",
          client_conditions: ["diabetes"],
        },
        mockContext,
      );

      if (result.contraindications.length > 0) {
        const contraindication = result.contraindications[0];
        expect(contraindication).toBeDefined();
        if (contraindication) {
          expect(contraindication.type).toBeDefined();
          expect(["absolute", "relative", "precaution"]).toContain(contraindication.type);
          expect(contraindication.severity).toBeDefined();
          expect(contraindication.reason).toBeDefined();
          expect(contraindication.recommendations).toBeDefined();
        }
      }
    });

    it("should handle medication interactions", async () => {
      const result = await getContraindicationsHandler(
        {
          treatment: "acupuncture",
          client_conditions: ["chronic pain"],
          medications: ["warfarin", "aspirin"],
        },
        mockContext,
      );

      expect(result.drugInteractions).toBeDefined();
      expect(Array.isArray(result.drugInteractions)).toBe(true);
    });

    it("should reject empty conditions array", async () => {
      await expect(
        getContraindicationsHandler(
          {
            treatment: "yoga",
            client_conditions: [],
          },
          mockContext,
        ),
      ).rejects.toThrow();
    });
  });

  describe("find_evidence_based_resources", () => {
    it("should find evidence-based resources successfully", async () => {
      const result = await findEvidenceBasedResourcesHandler(
        {
          condition: "chronic pain",
          resource_types: ["clinical_guideline", "meta_analysis"],
          quality_threshold: "high",
          max_results: 10,
        },
        mockContext,
      );

      expect(result.condition).toBe("chronic pain");
      expect(result.resources).toBeDefined();
      expect(Array.isArray(result.resources)).toBe(true);
      expect(result.qualityDistribution).toBeDefined();
    });

    it("should return resources with correct structure", async () => {
      const result = await findEvidenceBasedResourcesHandler(
        {
          condition: "anxiety disorders",
          max_results: 5,
        },
        mockContext,
      );

      if (result.resources.length > 0) {
        const resource = result.resources[0];
        expect(resource).toBeDefined();
        if (resource) {
          expect(resource.id).toBeDefined();
          expect(resource.type).toBeDefined();
          expect(resource.title).toBeDefined();
          expect(resource.summary).toBeDefined();
          expect(resource.keyFindings).toBeDefined();
          expect(Array.isArray(resource.keyFindings)).toBe(true);
          expect(resource.evidenceQuality).toBeDefined();
          expect(["high", "moderate", "low"]).toContain(resource.evidenceQuality);
        }
      }
    });

    it("should have quality distribution", async () => {
      const result = await findEvidenceBasedResourcesHandler(
        {
          condition: "insomnia",
          quality_threshold: "moderate",
          max_results: 10,
        },
        mockContext,
      );

      expect(result.qualityDistribution.high).toBeGreaterThanOrEqual(0);
      expect(result.qualityDistribution.moderate).toBeGreaterThanOrEqual(0);
      expect(result.qualityDistribution.low).toBeGreaterThanOrEqual(0);
    });

    it("should respect max_results parameter", async () => {
      const maxResults = 5;
      const result = await findEvidenceBasedResourcesHandler(
        {
          condition: "depression",
          max_results: maxResults,
        },
        mockContext,
      );

      expect(result.resources.length).toBeLessThanOrEqual(maxResults);
    });
  });
});

describe("Research Tools - Credit Costs", () => {
  it("all research tools should have non-zero credit costs", () => {
    expect(searchWellnessKnowledgeDefinition.creditCost).toBeGreaterThan(0);
    expect(getProtocolSuggestionsDefinition.creditCost).toBeGreaterThan(0);
    expect(searchMedicalResearchDefinition.creditCost).toBeGreaterThan(0);
    expect(getContraindicationsDefinition.creditCost).toBeGreaterThan(0);
    expect(findEvidenceBasedResourcesDefinition.creditCost).toBeGreaterThan(0);
  });

  it("should have appropriate credit cost tiers", () => {
    // Low cost (5 credits)
    expect(searchWellnessKnowledgeDefinition.creditCost).toBe(5);

    // Medium cost (10 credits)
    expect(getProtocolSuggestionsDefinition.creditCost).toBe(10);
    expect(getContraindicationsDefinition.creditCost).toBe(10);

    // High cost (15 credits)
    expect(searchMedicalResearchDefinition.creditCost).toBe(15);
    expect(findEvidenceBasedResourcesDefinition.creditCost).toBe(15);
  });
});

describe("Research Tools - Rate Limiting", () => {
  it("should have rate limits configured for expensive operations", () => {
    expect(searchWellnessKnowledgeDefinition.rateLimit).toBeDefined();
    expect(getProtocolSuggestionsDefinition.rateLimit).toBeDefined();
    expect(searchMedicalResearchDefinition.rateLimit).toBeDefined();
    expect(getContraindicationsDefinition.rateLimit).toBeDefined();
    expect(findEvidenceBasedResourcesDefinition.rateLimit).toBeDefined();
  });

  it("should have stricter limits for higher-cost operations", () => {
    // More expensive operations should have lower rate limits
    const medicalResearchLimit = searchMedicalResearchDefinition.rateLimit?.maxCalls || 0;
    const wellnessKnowledgeLimit = searchWellnessKnowledgeDefinition.rateLimit?.maxCalls || 0;

    expect(medicalResearchLimit).toBeLessThanOrEqual(wellnessKnowledgeLimit);
  });
});
