"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { AlertCircle, Upload, X } from "lucide-react";

interface FormValues {
  file?: File | null;
}

export default function FileUploadUploadDialog({
  onClose,
}: {
  onClose: (file: File | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<FormValues>();

  // If you need the submitted data, implement logic here
  const onSubmit: SubmitHandler<FormValues> = () => {
    setIsOpen(false); // Close the dialog after submission
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
    form.setValue("file", selectedFile);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          Upload Document
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-[425px]">
        {/* <AlertDialogContent className="relative sm:max-w-[425px]"> */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="absolute top-2 right-2"
        >
          <X className="h-4 w-4" />
        </Button>

        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            File Upload
          </AlertDialogTitle>
          <AlertDialogDescription>
            {file
              ? `Selected file: ${file.name}`
              : "Please select a file to upload."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Upload File</FormLabel>
                  <FormControl>
                    <div
                      className={`border-2 border-dashed rounded-lg p-4 text-center ${
                        isDragging ? "border-primary" : "border-gray-300"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          // Spread the rest of the field props, but exclude "value"
                          {...{
                            ...field,
                            value: undefined, // or delete `value` entirely
                          }}
                          onChange={(e) => {
                            // First call react-hook-form's onChange to update form state
                            field.onChange(e);

                            // Then do your custom logic
                            if (e.target.files?.[0]) {
                              handleFileChange(e.target.files[0]);
                            }
                          }}
                        />
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          Drag and drop a file here, or click to select a file
                        </p>
                      </label>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <AlertDialogFooter>
              <Button
                type="submit"
                className="w-full"
                onClick={() => onClose(file)}
              >
                Upload
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
