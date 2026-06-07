import { TabStub } from "@/components/TabStub";

export default function SleepPage() {
  return (
    <TabStub
      title="Sleep"
      body="Nightly duration, stage distribution donut, deep sleep %, quality heatmap. From sleep_sessions table (107 nights in DB)."
    />
  );
}
