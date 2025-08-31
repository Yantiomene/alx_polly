"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type CreateOrUpdateResult = { ok: boolean; pollId: string } | void;

type InitialValues = {
  title?: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  allow_multiple_votes?: boolean;
  allow_anonymous_votes?: boolean;
  options?: string[];
};

type Props = {
  action: (formData: FormData) => Promise<CreateOrUpdateResult>;
  titleText?: string;
  submitLabel?: string;
  successMessage?: string;
  initial?: InitialValues;
};

export default function CreatePollForm({ action, titleText, submitLabel, successMessage, initial }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");

  const [options, setOptions] = useState<string[]>(() => initial?.options && initial.options.length >= 2 ? initial.options : ["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const allowMultipleDefault = initial?.allow_multiple_votes ?? false;
  const allowAnonymousDefault = initial?.allow_anonymous_votes ?? true;

  // Format timestamps (ISO or DB string) to input[type=datetime-local] value
  const formatForInput = (v?: string | null) => {
    if (!v) return "";
    try {
      const d = new Date(v);
      // toISOString returns UTC; datetime-local expects YYYY-MM-DDTHH:mm
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } catch {
      return v;
    }
  };

  const headerTitle = titleText ?? (initial ? "Edit Poll" : "Create New Poll");
  const submitText = submitLabel ?? (initial ? "Save Changes" : "Create Poll");
  const successText = successMessage ?? (initial ? "Poll updated successfully! Redirecting to polls…" : "Poll created successfully! Redirecting to polls…");

  const addOption = () => setOptions((prev) => [...prev, ""]);
  const removeOption = (index: number) => {
    setOptions((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));
  };
  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{headerTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2 text-sm">
            {error === "invalid_input" && "Please provide a title and at least two options."}
            {error === "create_poll_failed" && "We couldn't create your poll. Please try again."}
            {error === "create_options_failed" && "Poll created but adding options failed. Please try again."}
            {error === "update_failed" && "We couldn't update your poll. Please try again."}
            {error === "update_options_failed" && "Poll updated but updating options failed. Please try again."}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md border border-emerald-300/60 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">
            {successText}
          </div>
        )}
        <form
          action={async (formData) => {
            try {
              setSubmitting(true);
              const result = await action(formData);
              if (result && (result as any).ok) {
                setSuccess(true);
                setTimeout(() => router.push("/polls"), 1200);
              } else {
                router.push("/polls");
              }
            } finally {
              setSubmitting(false);
            }
          }}
          className="grid gap-4"
        >
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="title">Poll Title</Label>
            <Input id="title" name="title" placeholder="Enter your poll question" required defaultValue={initial?.title ?? ""} />
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" name="description" placeholder="Add a description for your poll" defaultValue={initial?.description ?? ""} />
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="start_date">Start (optional)</Label>
              <Input id="start_date" name="start_date" type="datetime-local" defaultValue={formatForInput(initial?.start_date ?? null)} />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="end_date">End (optional)</Label>
              <Input id="end_date" name="end_date" type="datetime-local" defaultValue={formatForInput(initial?.end_date ?? null)} />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="allow_multiple_votes" className="h-4 w-4" defaultChecked={allowMultipleDefault} />
              Allow multiple votes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="allow_anonymous_votes" className="h-4 w-4" defaultChecked={allowAnonymousDefault} />
              Allow anonymous votes
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Options</Label>
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                + Add Option
              </Button>
            </div>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    name="options[]"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    required={idx < 2}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => removeOption(idx)}
                    disabled={options.length <= 2}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <CardFooter className="flex justify-end px-0">
            <Button type="submit" disabled={submitting}>
              {submitting ? (initial ? "Saving..." : "Creating...") : submitText}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}