"use client";

export default function Error({ error }: { error: Error }): JSX.Element {
  return (
    <div className="p-6 text-red-600" role="alert">
      Something went wrong: {error.message}
    </div>
  );
}
