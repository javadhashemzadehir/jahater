import { TaskProbe } from "@/features/tasks/task-probe";

export default function Page() {
  return (
    <div className="flex flex-1 flex-col items-center justify-start gap-4 py-8">
      <TaskProbe />
    </div>
  );
}
