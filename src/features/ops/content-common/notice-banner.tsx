export function SuccessNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="rounded-card-flat border border-line bg-white px-4 py-3 text-body text-ink"
    >
      {message}
    </p>
  );
}

export function FailureNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-caption text-danger">
      {message}
    </p>
  );
}
