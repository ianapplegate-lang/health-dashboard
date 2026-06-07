import { TabStub } from "@/components/TabStub";

export default function HrvPage() {
  return (
    <TabStub
      title="HRV & HR"
      body="Nightly RMSSD with biopsy band, HRV+RHR convergence, exercise HR monthly trend. From clinical_records (kind=HRV_RMSSD, 89 nights) + dailyMetrics RHR + workouts avg HR."
    />
  );
}
