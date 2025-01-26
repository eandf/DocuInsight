export interface LegalReviewData {
  key_clauses: Record<string, string>;
  unusual_terms: string[];
  important_risks: string[];
  key_commitments: string[];
  recommended_actions: string[];
  plain_english_summary: string;
}
