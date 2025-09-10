
'use client'
import { useRouter } from "next/navigation";
import CreatePollForm from "../../components/CreatePollForm";

export default function CreatePollPage() {
  const router = useRouter();

  const handleCreatePoll = async (formData: FormData) => {
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const allowMultipleVotes = formData.get("allow_multiple_votes") === "on";
    const allowAnonymousVotes = formData.get("allow_anonymous_votes") === "on";
    const startDateRaw = String(formData.get("start_date") || "").trim();
    const endDateRaw = String(formData.get("end_date") || "").trim();
    const options = (formData as any)
        .getAll("options[]")
        .map((o: any) => String(o).trim())
        .filter(Boolean);

    const response = await fetch('/api/polls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description,
        allow_multiple_votes: allowMultipleVotes,
        allow_anonymous_votes: allowAnonymousVotes,
        start_date: startDateRaw,
        end_date: endDateRaw,
        options,
      }),
    });

    if (response.ok) {
      const { pollId } = await response.json();
      router.push(`/polls/${pollId}`);
    } else {
      const { error } = await response.json();
      alert(`Failed to create poll: ${error}`);
    }
  };

  return <CreatePollForm onSubmit={handleCreatePoll} />;
}
