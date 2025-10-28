/**
 * Research & Knowledge Tools - Implementation Verification
 *
 * This test suite verifies that all 5 research tools are correctly implemented
 * with proper credit costs, rate limiting, and external API categorization.
 */

import { describe, it, expect } from "vitest";
import {
  searchWellnessKnowledgeDefinition,
  getProtocolSuggestionsDefinition,
  searchMedicalResearchDefinition,
  getContraindicationsDefinition,
  findEvidenceBasedResourcesDefinition,
} from "../research";

describe("Research & Knowledge Tools - Complete Implementation Verification", () => {
  const allResearchTools = [
    {
      definition: searchWellnessKnowledgeDefinition,
      expectedCost: 5,
      name: "search_wellness_knowledge",
    },
    {
      definition: getProtocolSuggestionsDefinition,
      expectedCost: 10,
      name: "get_protocol_suggestions",
    },
    {
      definition: searchMedicalResearchDefinition,
      expectedCost: 15,
      name: "search_medical_research",
    },
    {
      definition: getContraindicationsDefinition,
      expectedCost: 10,
      name: "get_contraindications",
    },
    {
      definition: findEvidenceBasedResourcesDefinition,
      expectedCost: 15,
      name: "find_evidence_based_resources",
    },
  ];

  it("should have all 5 research tools implemented", () => {
    expect(allResearchTools).toHaveLength(5);
    allResearchTools.forEach(({ definition, name }) => {
      expect(definition.name).toBe(name);
    });
  });

  it("all tools should be categorized as 'external' (not data_access)", () => {
    allResearchTools.forEach(({ definition, name }) => {
      expect(definition.category).toBe("external");
      expect(definition.category).not.toBe("data_access");
    });
  });

  it("all tools should have non-zero credit costs", () => {
    allResearchTools.forEach(({ definition, expectedCost, name }) => {
      expect(definition.creditCost).toBeGreaterThan(0);
      expect(definition.creditCost).toBe(expectedCost);
    });
  });

  it("all tools should be read-only (permissionLevel: read)", () => {
    allResearchTools.forEach(({ definition }) => {
      expect(definition.permissionLevel).toBe("read");
    });
  });

  it("all tools should be idempotent (safe to retry)", () => {
    allResearchTools.forEach(({ definition }) => {
      expect(definition.isIdempotent).toBe(true);
    });
  });

  it("all tools should be cacheable", () => {
    allResearchTools.forEach(({ definition }) => {
      expect(definition.cacheable).toBe(true);
      expect(definition.cacheTtlSeconds).toBeGreaterThan(0);
    });
  });

  it("all tools should have rate limiting configured", () => {
    allResearchTools.forEach(({ definition, name }) => {
      expect(definition.rateLimit).toBeDefined();
      expect(definition.rateLimit?.maxCalls).toBeGreaterThan(0);
      expect(definition.rateLimit?.windowMs).toBeGreaterThan(0);
    });
  });

  it("should have proper credit cost tiers", () => {
    // Low cost (5 credits) - basic knowledge base search
    const lowCostTools = allResearchTools.filter((t) => t.expectedCost === 5);
    expect(lowCostTools).toHaveLength(1);
    expect(lowCostTools[0]?.name).toBe("search_wellness_knowledge");

    // Medium cost (10 credits) - protocol suggestions and contraindication checks
    const mediumCostTools = allResearchTools.filter((t) => t.expectedCost === 10);
    expect(mediumCostTools).toHaveLength(2);
    expect(mediumCostTools.map((t) => t.name)).toContain("get_protocol_suggestions");
    expect(mediumCostTools.map((t) => t.name)).toContain("get_contraindications");

    // High cost (15 credits) - comprehensive medical research
    const highCostTools = allResearchTools.filter((t) => t.expectedCost === 15);
    expect(highCostTools).toHaveLength(2);
    expect(highCostTools.map((t) => t.name)).toContain("search_medical_research");
    expect(highCostTools.map((t) => t.name)).toContain("find_evidence_based_resources");
  });

  it("should have appropriate tags for discoverability", () => {
    allResearchTools.forEach(({ definition }) => {
      expect(definition.tags).toContain("research");
      expect(definition.tags).toContain("external-api");
      expect(definition.tags).toContain("paid");
    });
  });

  it("should have comprehensive documentation", () => {
    allResearchTools.forEach(({ definition, name }) => {
      expect(definition.description).toBeTruthy();
      expect(definition.description.length).toBeGreaterThan(50);
      expect(definition.useCases).toBeDefined();
      expect(definition.useCases.length).toBeGreaterThanOrEqual(3);
      expect(definition.exampleCalls).toBeDefined();
      expect(definition.exampleCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("should have proper parameter definitions", () => {
    allResearchTools.forEach(({ definition, name }) => {
      expect(definition.parameters).toBeDefined();
      expect(definition.parameters.type).toBe("object");
      expect(definition.parameters.properties).toBeDefined();
      expect(definition.parameters.required).toBeDefined();
      expect(Array.isArray(definition.parameters.required)).toBe(true);
    });
  });

  describe("Tool-Specific Verification", () => {
    it("search_wellness_knowledge should have category filter", () => {
      const params = searchWellnessKnowledgeDefinition.parameters;
      expect(params.properties?.category).toBeDefined();
    });

    it("get_protocol_suggestions should have modality filter", () => {
      const params = getProtocolSuggestionsDefinition.parameters;
      expect(params.properties?.modality).toBeDefined();
    });

    it("search_medical_research should have databases parameter", () => {
      const params = searchMedicalResearchDefinition.parameters;
      expect(params.properties?.databases).toBeDefined();
    });

    it("get_contraindications should require client_conditions", () => {
      const params = getContraindicationsDefinition.parameters;
      expect(params.required).toContain("client_conditions");
    });

    it("find_evidence_based_resources should have quality_threshold", () => {
      const params = findEvidenceBasedResourcesDefinition.parameters;
      expect(params.properties?.quality_threshold).toBeDefined();
    });
  });

  describe("Rate Limiting Strategy", () => {
    it("higher-cost tools should have stricter rate limits", () => {
      const wellnessKnowledgeLimit =
        searchWellnessKnowledgeDefinition.rateLimit?.maxCalls || 0;
      const medicalResearchLimit = searchMedicalResearchDefinition.rateLimit?.maxCalls || 0;

      // Medical research (15 credits) should have lower limit than wellness knowledge (5 credits)
      expect(medicalResearchLimit).toBeLessThanOrEqual(wellnessKnowledgeLimit);
    });

    it("all tools should have hourly rate windows", () => {
      allResearchTools.forEach(({ definition }) => {
        expect(definition.rateLimit?.windowMs).toBe(3600000); // 1 hour in ms
      });
    });
  });

  describe("Cache Strategy", () => {
    it("should cache for at least 1 hour", () => {
      allResearchTools.forEach(({ definition }) => {
        expect(definition.cacheTtlSeconds).toBeGreaterThanOrEqual(3600);
      });
    });

    it("knowledge base searches should have long cache times", () => {
      expect(searchWellnessKnowledgeDefinition.cacheTtlSeconds).toBe(86400); // 24 hours
      expect(searchMedicalResearchDefinition.cacheTtlSeconds).toBe(86400); // 24 hours
    });
  });
});

describe("Implementation Quality Assurance", () => {
  it("should follow naming conventions (snake_case)", () => {
    const tools = [
      "search_wellness_knowledge",
      "get_protocol_suggestions",
      "search_medical_research",
      "get_contraindications",
      "find_evidence_based_resources",
    ];

    tools.forEach((name) => {
      expect(name).toMatch(/^[a-z_]+$/);
      expect(name).not.toMatch(/[A-Z]/);
      expect(name).not.toMatch(/-/);
    });
  });

  it("all tools should be marked as NOT deprecated", () => {
    const allTools = [
      searchWellnessKnowledgeDefinition,
      getProtocolSuggestionsDefinition,
      searchMedicalResearchDefinition,
      getContraindicationsDefinition,
      findEvidenceBasedResourcesDefinition,
    ];

    allTools.forEach((def) => {
      expect(def.deprecated).toBe(false);
    });
  });

  it("all tools should have version 1.0.0", () => {
    const allTools = [
      searchWellnessKnowledgeDefinition,
      getProtocolSuggestionsDefinition,
      searchMedicalResearchDefinition,
      getContraindicationsDefinition,
      findEvidenceBasedResourcesDefinition,
    ];

    allTools.forEach((def) => {
      expect(def.version).toBe("1.0.0");
    });
  });
});
