import { Job } from "@/types/database";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export default function JobTable({ jobs }: { jobs: Job[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
            .map((job) => {
              const created = new Date(job.created_at);
              const lastModified = new Date(job.updated_at);

              const options: Intl.DateTimeFormatOptions = {
                year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
                hour12: true,
              };

              const createdStr = created.toLocaleString("en-US", options);
              const lastModifiedStr = lastModified.toLocaleString(
                "en-US",
                options
              );

              const signingURL = job.docu_sign_envelope_id
                ? `${process.env.NEXT_PUBLIC_BASE_URL}/sign?job=${
                    job.id
                  }&invite=${job.recipients![0].inviteId}`
                : `${process.env.NEXT_PUBLIC_BASE_URL}/sign?job=${job.id}`;

              return (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.file_name}</TableCell>
                  <TableCell className="font-medium">{createdStr}</TableCell>
                  <TableCell className="font-medium">
                    {lastModifiedStr}
                  </TableCell>
                  <TableCell className="font-medium">{job.status}</TableCell>
                  <TableCell>
                    <Link className={buttonVariants()} href={signingURL}>
                      View Report
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );
}
