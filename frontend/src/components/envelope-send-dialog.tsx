"use client";

import { DocusignAccountInfo } from "@/types/docusign";
import {
  EnvelopeTemplate,
  EnvelopeTemplateResults,
  Signer,
} from "docusign-esign";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { getDocusignAccounts } from "@/actions/docusign";

export default function EnvelopeSendDialog() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accounts, setAccounts] = useState<DocusignAccountInfo[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );
  const [templates, setTemplates] = useState<EnvelopeTemplate[] | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EnvelopeTemplate | null>(null);
  const [templateSigners, setTemplateSigners] = useState<Signer[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingEnvelope, setCreatingEnvelope] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "signers" | "result">("select");

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

  const handleCreateEnvelope = async () => {
    setCreatingEnvelope(true);
    setErrorMessage(null);
    setSuccessMessage(null);
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
        throw new Error("Failed to create envelope");
      }

      setSuccessMessage("Envelope created and sent successfully!");
      setStep("result");
    } catch (error) {
      console.error("Error creating envelope:", error);
      setErrorMessage("Failed to create envelope. Please try again.");
    } finally {
      setCreatingEnvelope(false);
    }
  };

  const handleConfirmSelection = () => {
    if (selectedTemplate) {
      const recipients = selectedTemplate.recipients;
      const signers = recipients?.signers ?? [];
      setTemplateSigners(signers);
      setStep("signers");
    }
  };

  const resetDialog = () => {
    setSelectedAccountId(null);
    setTemplates(null);
    setSelectedTemplate(null);
    setTemplateSigners([]);
    setStep("select");
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  useEffect(() => {
    const loadAccounts = async () => {
      setAccountsLoading(true);
      try {
        const fetchedAccounts = await getDocusignAccounts(); // Call the server action
        setAccounts(fetchedAccounts);
        if (fetchedAccounts.length > 0) {
          setSelectedAccountId(fetchedAccounts[0].accountId);
        }
      } catch (error) {
        console.error(error);
        setErrorMessage("Failed to load accounts. Please try again.");
      } finally {
        setAccountsLoading(false);
      }
    };
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId && dialogOpen && step === "select") {
      void getTemplates(selectedAccountId);
    }
  }, [selectedAccountId, dialogOpen, step]);

  return (
    <div className="">
      <Button
        onClick={() => setDialogOpen(true)}
        disabled={accountsLoading || accounts.length === 0}
        variant="outline"
      >
        {accountsLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        Send Docusign Envelope
      </Button>

      <AlertDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) resetDialog();
          setDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          {step === "select" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Select Account and Template</AlertDialogTitle>
              </AlertDialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Account</Label>
                  <Select
                    value={selectedAccountId || ""}
                    onValueChange={setSelectedAccountId}
                    disabled={
                      loading || accountsLoading || accounts.length === 0
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          accountsLoading
                            ? "Loading accounts..."
                            : accounts.length === 0
                            ? "No accounts available"
                            : "Select account"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem
                          key={account.accountId}
                          value={account.accountId}
                        >
                          {account.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select
                    value={selectedTemplate?.templateId || ""}
                    onValueChange={(value) => {
                      const template = templates?.find(
                        (t) => t.templateId === value
                      );
                      setSelectedTemplate(template || null);
                    }}
                    disabled={loading || !templates || templates.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loading
                            ? "Loading templates..."
                            : !templates
                            ? "Select an account first"
                            : "Select template"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.map((template) => (
                        <SelectItem
                          key={template.templateId}
                          value={template.templateId as string}
                        >
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {errorMessage && (
                  <div className="text-sm text-red-700 bg-red-100 p-2 rounded">
                    {errorMessage}
                  </div>
                )}
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading || accountsLoading}>
                  Cancel
                </AlertDialogCancel>
                <Button
                  onClick={handleConfirmSelection}
                  disabled={
                    !selectedAccountId ||
                    !selectedTemplate ||
                    loading ||
                    accountsLoading
                  }
                >
                  Confirm Selection
                </Button>
              </AlertDialogFooter>
            </>
          )}

          {step === "signers" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Enter Signer Information</AlertDialogTitle>
                <AlertDialogDescription>
                  Please provide name and email for each signer.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-4 py-4">
                {templateSigners.map((role, index) => (
                  <div key={`${role.roleName}-${index}`} className="space-y-2">
                    <div>
                      <Label>{role.roleName || "Signer"} Name</Label>
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
                    </div>
                    <div>
                      <Label>{role.roleName || "Signer"} Email</Label>
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
                  </div>
                ))}

                {errorMessage && (
                  <div className="text-sm text-red-700 bg-red-100 p-2 rounded">
                    {errorMessage}
                  </div>
                )}
              </div>

              <AlertDialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setStep("select")}
                  disabled={creatingEnvelope}
                >
                  Back
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
                  {creatingEnvelope ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Envelope
                </Button>
              </AlertDialogFooter>
            </>
          )}

          {step === "result" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {successMessage ? "Success" : "Error"}
                </AlertDialogTitle>
              </AlertDialogHeader>

              <div className="py-4">
                {successMessage && (
                  <div className="text-sm text-green-700 bg-green-100 p-2 rounded">
                    {successMessage}
                  </div>
                )}
                {errorMessage && (
                  <div className="text-sm text-red-700 bg-red-100 p-2 rounded">
                    {errorMessage}
                  </div>
                )}
              </div>

              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setDialogOpen(false)}>
                  Close
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
