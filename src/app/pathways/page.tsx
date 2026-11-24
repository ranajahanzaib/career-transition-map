import { UnavailableView } from "../_visual-shell";

export default function Page() {
  return (
    <UnavailableView
      active="rivers"
      title="Mobility Rivers"
      description="Explore weighted worker movement across occupations and occupational families."
      evidence="Weighted transition cells are available in the Transition Matrix. This flow view is not yet implemented; CPS occupation codes also lack a validated crosswalk to the O*NET occupation profiles, and replicate-weight uncertainty is unavailable."
    />
  );
}
