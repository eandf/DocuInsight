"use client";

import type { DocusignAccountInfo } from "@/types/docusign";
import { useState, useEffect } from "react";
import {
  Signer,
  type EnvelopeTemplate,
  type EnvelopeTemplateResults,
} from "docusign-esign";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Dashboard({
  accounts,
}: {
  accounts: DocusignAccountInfo[];
}) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    accounts[0]?.accountId || null
  );
  const [templates, setTemplates] = useState<EnvelopeTemplate[] | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EnvelopeTemplate | null>(null);
  const [templateSigners, setTemplateSigners] = useState<Signer[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const getTemplates = async (accountId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/docusign/list-templates?account_id=${accountId}`
      );
      const data = (await response.json()) as EnvelopeTemplateResults;
      setTemplates((data.envelopeTemplates as EnvelopeTemplate[]) || []);
    } catch (error) {
      console.error("failed to fetch templates:", error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (template: EnvelopeTemplate) => {
    setSelectedTemplate(template);
    const recipients = template.recipients;
    const signers = recipients?.signers ?? [];
    setTemplateSigners(signers);

    for (const signer of signers) {
      if (!signer.name || !signer.email) {
        setDialogOpen(true);
      }
    }
  };

  const handleCreateEnvelope = async () => {
    const formData = new FormData();
    formData.set("docusign_account_id", selectedAccountId as string);
    formData.set(
      "docusign_template_id",
      selectedTemplate?.templateId as string
    );
    formData.set("recipients", JSON.stringify(templateSigners));

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/jobs`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      console.error("Error creating envelope", response);
    }

    setDialogOpen(false);
  };

  useEffect(() => {
    if (selectedAccountId) {
      void getTemplates(selectedAccountId);
    }
  }, [selectedAccountId]);

  return (
    <div className="space-y-4 max-w-screen-xl mx-auto p-4 pt-8">
      <div className="flex w-full gap-2 items-center font-medium">
        <span>Selected Account:</span>
        <Select
          value={selectedAccountId || ""}
          onValueChange={(value) => setSelectedAccountId(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.accountId} value={account.accountId}>
                {account.accountName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && <div>Loading templates...</div>}

      {!loading && templates && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => {
                const created = new Date(template.created as string);
                const lastModified = new Date(template.lastModified as string);

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

                return (
                  <TableRow key={template.templateId}>
                    <TableCell className="font-medium">
                      {template.name}
                    </TableCell>
                    <TableCell className="font-medium">
                      {template.owner?.userName}
                    </TableCell>
                    <TableCell className="font-medium">{createdStr}</TableCell>
                    <TableCell className="font-medium">
                      {lastModifiedStr}
                    </TableCell>
                    <TableCell>
                      <Button onClick={() => handleUseTemplate(template)}>
                        Use
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fill in Role Info</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter name/email for any roles that need it.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {templateSigners.map((role, index) => (
            <div key={`${role.roleName}-${index}`} className="my-2">
              <Label className="mt-2">{role.roleName || "Signer"} Name</Label>
              <Input
                value={role.name ?? ""}
                onChange={(e) => {
                  const updatedRoles = [...templateSigners];
                  updatedRoles[index].name = e.target.value;
                  setTemplateSigners(updatedRoles);
                }}
                placeholder="Full name"
              />

              <Label className="mt-2">{role.roleName || "Signer"} Email</Label>
              <Input
                type="email"
                value={role.email ?? ""}
                onChange={(e) => {
                  const updatedRoles = [...templateSigners];
                  updatedRoles[index].email = e.target.value;
                  setTemplateSigners(updatedRoles);
                }}
                placeholder="email@example.com"
              />
            </div>
          ))}

          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEnvelope}>Create Envelope</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
