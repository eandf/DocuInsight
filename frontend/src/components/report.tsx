import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { LegalReviewData } from "@/types/report";

export default function Report({ data }: { data: LegalReviewData }) {
  return (
    <ScrollArea className="w-full flex-1">
      <Accordion type="multiple" className="w-full">
        {/* Plain English Summary */}
        <AccordionItem value="plain_english_summary">
          <AccordionTrigger className="px-4 py-2 text-lg font-semibold flex items-center h-12 hover:bg-slate-50 border-b border-b-slate-100">
            Plain English Summary
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-4 pb-6">
            <p>{data.plain_english_summary}</p>
          </AccordionContent>
        </AccordionItem>

        {/* Key Clauses (object of key -> explanation) */}
        <AccordionItem value="key_clauses">
          <AccordionTrigger className="px-4 py-2 text-lg font-semibold flex items-center h-12 hover:bg-slate-50 border-b border-b-slate-100">
            Key Clauses
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-4 pb-6">
            <ul className="list-disc pl-4 space-y-2">
              {Object.entries(data.key_clauses).map(
                ([clause, description], i) => (
                  <li key={i}>
                    <strong>{clause}:</strong> {description}
                  </li>
                )
              )}
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Unusual Terms */}
        <AccordionItem value="unusual_terms">
          <AccordionTrigger className="px-4 py-2 text-lg font-semibold flex items-center h-12 hover:bg-slate-50 border-b border-b-slate-100">
            Unusual Terms
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-4 pb-6">
            <ul className="list-disc pl-4 space-y-2">
              {data.unusual_terms.map((term, idx) => (
                <li key={idx}>{term}</li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Important Risks */}
        <AccordionItem value="important_risks">
          <AccordionTrigger className="px-4 py-2 text-lg font-semibold flex items-center h-12 hover:bg-slate-50 border-b border-b-slate-100">
            Important Risks
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-4 pb-6">
            <ul className="list-disc pl-4 space-y-2">
              {data.important_risks.map((risk, idx) => (
                <li key={idx}>{risk}</li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Key Commitments */}
        <AccordionItem value="key_commitments">
          <AccordionTrigger className="px-4 py-2 text-lg font-semibold flex items-center h-12 hover:bg-slate-50 border-b border-b-slate-100">
            Key Commitments
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-4 pb-6">
            <ul className="list-disc pl-4 space-y-2">
              {data.key_commitments.map((commitment, idx) => (
                <li key={idx}>{commitment}</li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Recommended Actions */}
        <AccordionItem value="recommended_actions">
          <AccordionTrigger className="px-4 py-2 text-lg font-semibold flex items-center h-12 hover:bg-slate-50 border-b border-b-slate-100">
            Recommended Actions
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-4 pb-6">
            <ul className="list-disc pl-4 space-y-2">
              {data.recommended_actions.map((action, idx) => (
                <li key={idx}>{action}</li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </ScrollArea>
  );
}
