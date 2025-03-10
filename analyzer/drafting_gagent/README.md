# Short Report: Comparison of AI Contract Analysis Agents

## Date

March 9, 2025

## Overview

Two AI agents analyzed the "Orrick Start-Up Forms" and "Consulting Agreement" contract from the same "example.pdf": Agent 1 (using "deepseek-r1-distill-llama-70b" + "gpt-4o-mini") and Agent 2 (using "o1" + "gpt-4o-mini"). We evaluated their outputs for clarity, comprehensiveness, accuracy, practicality, and relevance, determining which performed better and how close Agent 1’s quality was to Agent 2’s. Tests were conducted on March 09, 2025, with Agent 2 taking 36.29 seconds and costing $0.26411685, while Agent 1 ran in 17.066 seconds and cost $0.00886422.

## Findings

- **Agent 2 Superiority**: Agent 2 outperformed Agent 1 with its holistic analysis, covering both the Terms & Conditions and Consulting Agreement. It offered clearer, more comprehensive insights (e.g., disclaimers, IP assignment), broader practical guidance, and greater relevance to diverse users. OpenAI’s O1 model also favored Agent 2 ("openai.json") for its depth and clarity on disclaimers.

- **Agent 1 Performance**: Agent 1 provided a concise, accurate analysis focused solely on the Consulting Agreement, with specific recommendations (e.g., negotiate indemnification). However, it omitted the critical Terms & Conditions context, limiting its scope and utility.

- **Performance Metrics**:

  - **Agent 2 (OpenAI-based)**: Runtime: 36.29 seconds, Cost: $0.26411685.
  - **Agent 1 (Groq-based)**: Runtime: 17.066 seconds, Cost: $0.00886422.
  - Agent 1 was significantly faster (53% less time) and cheaper (97% less cost) but traded off depth for efficiency.

- **Quantitative Rankings**:
  - My analysis scored Agent 1 at 83/100 (~89% of Agent 2’s ~93/100 benchmark).
  - OpenAI’s O1 rated Agent 1 at 70/100 compared to Agent 2.
  - You and your partner consensus ranked Agent 1 as 75% as good as Agent 2, balancing its efficiency and focus against its narrower scope.

## Conclusion

Agent 2 is the better performer for its comprehensive and versatile output, ideal for most users analyzing legal contracts, despite its longer runtime (36.29 seconds) and higher cost ($0.26411685). Agent 1, while efficient (17.066 seconds, $0.00886422) and strong for consultant-specific needs, falls short by ~25% in quality (per your consensus with your partner) due to its limited coverage. For a quick, cost-effective analysis, Agent 1 suffices, but Agent 2 excels for thoroughness and broader applicability.

## Final Take

OAgent (Agent 2) is better over all, but it's a little over 2x slower and costs about 30x more compared to GAgent (Agent 1) which is, in our option, ~75% as good in quality as the OAgent.
