import type { ReportSection } from "@/types/report";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Report({ data }: { data: ReportSection[] }) {
  const keyClausesIndex = data.findIndex(
    (section) => section.title.toLowerCase() === "key clauses"
  );

  return (
    <ScrollArea className="w-full flex-1">
      <Accordion
        type="multiple"
        defaultValue={
          keyClausesIndex !== -1 ? [keyClausesIndex.toString()] : []
        }
        className="w-full"
      >
        {data.map((section, index) => (
          <div key={index}>
            <AccordionItem value={index.toString()} className="">
              <AccordionTrigger className="px-4 py-2 text-lg font-semibold flex items-center h-12 hover:no-underline hover:bg-slate-50 border-b border-b-slate-100">
                {section.title}
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-4 pb-6">
                {section.title.toLowerCase() === "summary" ? (
                  <p>{section.content[0]}</p>
                ) : (
                  <ul className="list-disc pl-4 space-y-2">
                    {section.content.map((item, itemIndex) => (
                      <li key={itemIndex}>
                        {section.title.toLowerCase() === "key clauses" ? (
                          <>
                            <strong>{item.split(":")[0]}:</strong>
                            {item.split(":").slice(1).join(":")}
                          </>
                        ) : (
                          item
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </AccordionContent>
            </AccordionItem>
          </div>
        ))}
      </Accordion>
    </ScrollArea>
  );
}
