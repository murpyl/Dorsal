import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Small destructive alert for mutation errors; renders nothing when there is no message. */
export function InlineError({ message, className }: { message: string | null | undefined; className?: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
