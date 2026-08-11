import SharedPlacePollView from "@/components/SharedPlacePoll";
import "./shared-poll.css";

export default async function SharedPlacePollPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedPlacePollView token={token} />;
}
