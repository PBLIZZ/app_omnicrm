# Enhanced Reflection Tool – PRD

**Version:** 1.1
**Owner:** Product Design Team, Omnipotency AI
**Date:** October 2025
**Status:** Concept – scheduled for post-MVP iteration

---

## 1. Purpose

The Enhanced Reflection Tool transforms raw mood-tracking data into meaningful emotional and behavioral insight. It bridges everyday self-reporting (“I feel sad”) with a deeper understanding of _why_—introducing users to the concept of **energy centers** (chakras) and how emotional balance or imbalance drives behavior.

This feature extends the Mood Tracker by providing an optional reflective layer for users who want personal growth, not just tracking.

---

## 2. Product Vision

A self-reflection system that connects moods → patterns → insights → actionable change.
The tool uses familiar emotional language but gradually introduces the language of _energy_, _expression_, and _balance_. Each reflection session offers one simple, high-impact recommendation that can be turned into a task or habit.

---

## 3. Key Objectives

- Translate emotional data into clear psychological and energetic insights.
- Present chakra-based balance concepts without spiritual jargon—accessible to both secular and spiritual users.
- Offer one actionable suggestion per reflection (“the one thing”) that can rebalance multiple emotional domains.
- Allow frictionless task creation directly from reflection insights.
- Preserve continuity with the Mood Tracker’s data schema and UX flow.

---

## 4. Core Functionality

### 4.1 Reflection Interface

- **Seven rows**, each representing an energy center (Root → Crown).
- Each row has **three selectable states**: Under-active (−), Balanced (○), Over-active (+).
- Optional “auto-suggest” button pre-fills likely states based on recent mood trends.
- Color scheme aligns with chakra hues (balanced = saturated, imbalanced = desaturated).

### 4.2 Chakra States Reference

| Chakra           | Under-active          | Balanced   | Over-active               |
| ---------------- | --------------------- | ---------- | ------------------------- |
| **Root**         | Disconnected, fearful | Grounded   | Controlling, rigid        |
| **Sacral**       | Numb, uncreative      | Flowing    | Addictive, indulgent      |
| **Solar Plexus** | Powerless, doubtful   | Confident  | Dominating, angry         |
| **Heart**        | Closed, guarded       | Loving     | Clingy, self-sacrificing  |
| **Throat**       | Silent, repressed     | Expressive | Over-talkative, dogmatic  |
| **Third Eye**    | Confused, dismissive  | Insightful | Fantasizing, paranoid     |
| **Crown**        | Nihilistic, cynical   | Connected  | Dissociated, “spaced out” |

This tri-state mapping provides a behavioral interpretation of energetic balance and informs both the UI copy and the AI Insight Engine’s tone.

### 4.3 Chakra Domain Reference Table

| Chakra           | Domain                     | Out of Balance      | In Balance   | Example Prompt                                              |
| ---------------- | -------------------------- | ------------------- | ------------ | ----------------------------------------------------------- |
| **Crown**        | Connection / Meaning       | Disconnected        | Connected    | “Do you feel aligned with something greater than yourself?” |
| **Third Eye**    | Clarity / Vision           | Confused            | Insightful   | “Are your thoughts clear or cloudy today?”                  |
| **Throat**       | Expression / Communication | Frustrated          | Expressive   | “Do you feel heard and understood?”                         |
| **Heart**        | Love / Compassion          | Sad or Guarded      | Joyful       | “Are you open to giving and receiving love?”                |
| **Solar Plexus** | Power / Action             | Angry or Helpless   | Confident    | “Do you feel capable and in control?”                       |
| **Sacral**       | Emotion / Flow             | Troubled or Blocked | Free-Flowing | “Are you moving with or against your emotions?”             |
| **Root**         | Safety / Stability         | Afraid              | Grounded     | “Do you feel safe and supported right now?”                 |

This table complements the three-state system, defining both the psychological tone and reflective prompts used in-app.

### 4.4 Insight Engine

- Consumes the user’s mood history and current reflection input.
- Identifies dominant imbalances and correlated behavioral drivers (e.g., control, avoidance, attachment).
- Generates a concise insight summary:

  > “Your throat energy has been under-active—difficulty expressing your needs may be fueling anxiety.”

### 4.5 Resolution Generator

- Uses internal AI prompt templates to surface one balancing action (the “one thing”).

  > “Spend five minutes journaling freely—no editing, no filter.”

- Allows instant creation of a task or habit from that suggestion (linked to Client Care or Self-Care zones).

### 4.6 Optional Education Layer

- Tap “Learn More” for psycho-educational text about each energy center.
- Language emphasizes behavioral patterns rather than metaphysics.

  > “Solar Plexus governs autonomy and motivation—balance means taking action without needing control.”

---

## 5. Data Flow

1. User completes Mood Tracker entry.
2. Reflection Tool receives recent mood summary + context.
3. User optionally completes 7-row reflection.
4. AI generates insight and balancing recommendation.
5. User can:

   - Save reflection to timeline.
   - Convert “one thing” into a task.
   - Skip reflection to keep journaling frictionless.

Data stored in `reflections` table (fields: user_id, date, chakra_states JSON, insight, recommendation, created_task_id).

---

## 6. UX Principles

- **Familiar → Transformative:** Start with relatable emotions, reveal energetic patterns over time.
- **Gentle Authority:** Insights sound like guidance, not correction.
- **Minimal Input:** Seven quick taps, one suggestion, done.
- **Visual Coherence:** Balanced = vivid hue, underactive = pale, overactive = oversaturated or glowing.

---

## 7. Success Metrics

- ≥ 40% of regular Mood Tracker users engage with Reflection Tool within first 30 days.
- ≥ 25% of reflections lead to task creation.
- User feedback scores average ≥ 4/5 for clarity and usefulness.
- Increased daily engagement time without friction (target +15%).

---

## 8. Future Enhancements

- **Trend Visualizations:** Chakra balance heatmaps over time.
- **AI Journaling Companion:** Auto-generate reflective journal prompts based on patterns.
- **Voice Input:** Speak reflections, transcribed and analyzed.
- **Integration:** Sync insights with Goals & Habits engine for holistic self-growth tracking.

---

## 9. Risks & Considerations

- Avoid overly esoteric or prescriptive language—users must feel empowered, not diagnosed.
- Ensure accessibility: color-blind safe palette and plain-language labels.
- Manage token cost for AI insight generation (batch processing or caching frequent patterns).

---

## 10. Summary

The Enhanced Reflection Tool deepens emotional intelligence inside the wellness ecosystem. It maintains the simplicity users expect from a mood tracker while introducing a profound self-development path—an elegant bridge between **daily emotion** and **energetic awareness**.
