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
import { Loader2 } from "lucide-react"; // Importing Loader for spinner
import FileUploadDialog from "@/components/file-upload-dialog";

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
  const [creatingEnvelope, setCreatingEnvelope] = useState(false); // New state
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // New state for success feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // New state for error feedback

  const getTemplates = async (accountId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/docusign/list-templates?account_id=${accountId}`
      );
      const data = (await response.json()) as EnvelopeTemplateResults;
      setTemplates((data.envelopeTemplates as EnvelopeTemplate[]) || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      setTemplates([]);
      setErrorMessage("Failed to load templates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (template: EnvelopeTemplate) => {
    setSelectedTemplate(template);
    const recipients = template.recipients;
    const signers = recipients?.signers ?? [];
    setTemplateSigners(signers);

    // Check if any signer is missing name or email
    const missingInfo = signers.some((signer) => !signer.name || !signer.email);
    if (missingInfo) {
      setDialogOpen(true);
    } else {
      // If no missing info, proceed to create the envelope directly
      await handleCreateEnvelope();
    }
  };

  const handleCreateEnvelope = async () => {
    setCreatingEnvelope(true); // Start loading
    setErrorMessage(null); // Reset error message
    setSuccessMessage(null); // Reset success message
    try {
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
        const errorText = await response.text();
        console.error("Error creating envelope", errorText);
        setErrorMessage("Failed to create envelope. Please try again.");
      } else {
        setSuccessMessage("Envelope created and sent successfully!");
        // Reset relevant states
        setSelectedTemplate(null);
        setTemplateSigners([]);
        // Optionally, refresh templates if needed
        if (selectedAccountId) {
          await getTemplates(selectedAccountId);
        }
      }

      setDialogOpen(false); // Close the dialog on success or failure
    } catch (error) {
      console.error("Error creating envelope:", error);
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setCreatingEnvelope(false); // End loading
    }
  };

  useEffect(() => {
    if (selectedAccountId) {
      void getTemplates(selectedAccountId);
    }
    // Reset selected template and signers when account changes
    setSelectedTemplate(null);
    setTemplateSigners([]);
  }, [selectedAccountId]);

  return (
    <div className="space-y-4 max-w-screen-xl mx-auto p-4 pt-8">
      {/* Success Message */}
      {successMessage && (
        <div
          className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg"
          role="alert"
        >
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div
          className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <div className="flex">
        <div className="flex w-full gap-2 items-center font-medium">
          <span>Selected Account:</span>
          <Select
            value={selectedAccountId || ""}
            onValueChange={(value) => setSelectedAccountId(value)}
            disabled={loading || creatingEnvelope}
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
        <FileUploadDialog />
      </div>

      {loading && (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading templates...</span>
        </div>
      )}

      {!loading && templates && templates.length > 0 && (
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
                      <Button
                        onClick={() => handleUseTemplate(template)}
                        disabled={creatingEnvelope}
                      >
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

      {!loading && templates && templates.length === 0 && (
        <div className="p-4 text-sm text-muted-foreground">
          No templates available for the selected account.
        </div>
      )}

      <AlertDialog
        open={dialogOpen}
        onOpenChange={(isOpen) => {
          // Prevent closing the dialog by external means if creatingEnvelope is true
          if (!creatingEnvelope) {
            setDialogOpen(isOpen);
          }
        }}
      >
        <AlertDialogContent>
          {/* Conditionally render the header only when not creating the envelope */}
          {!creatingEnvelope && (
            <AlertDialogHeader>
              <AlertDialogTitle>Fill in Role Info</AlertDialogTitle>
              <AlertDialogDescription>
                Please enter name/email for any roles that need it.
              </AlertDialogDescription>
            </AlertDialogHeader>
          )}

          {creatingEnvelope ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground mt-2">
                {"Creating and sending envelope..."}
              </p>
            </div>
          ) : (
            <>
              {templateSigners.map((role, index) => (
                <div key={`${role.roleName}-${index}`} className="my-4">
                  <Label className="mt-2">
                    {role.roleName || "Signer"} Name
                  </Label>
                  <Input
                    value={role.name ?? ""}
                    onChange={(e) => {
                      const updatedRoles = [...templateSigners];
                      updatedRoles[index].name = e.target.value;
                      setTemplateSigners(updatedRoles);
                    }}
                    placeholder="Full name"
                    disabled={creatingEnvelope}
                  />

                  <Label className="mt-2">
                    {role.roleName || "Signer"} Email
                  </Label>
                  <Input
                    type="email"
                    value={role.email ?? ""}
                    onChange={(e) => {
                      const updatedRoles = [...templateSigners];
                      updatedRoles[index].email = e.target.value;
                      setTemplateSigners(updatedRoles);
                    }}
                    placeholder="email@example.com"
                    disabled={creatingEnvelope}
                  />
                </div>
              ))}

              <AlertDialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    // Optionally, reset signers if dialog is canceled
                    setTemplateSigners((prevSigners) =>
                      prevSigners.map((signer) => ({
                        ...signer,
                        name: "",
                        email: "",
                      }))
                    );
                  }}
                  disabled={creatingEnvelope}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateEnvelope}
                  disabled={
                    creatingEnvelope ||
                    templateSigners.some(
                      (signer) => !signer.name || !signer.email
                    )
                  }
                >
                  {"Create Envelope"}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
