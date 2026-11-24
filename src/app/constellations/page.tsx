import { UnavailableView } from "../_visual-shell";

export default function Page() {
  return (
    <UnavailableView
      active="constellations"
      title="Career Constellations"
      description="Inspect incoming and outgoing transitions alongside occupational profile similarities."
      evidence="CPS transition cells are available in the Transition Matrix, but a validated crosswalk to O*NET-SOC is not yet included. Profile-similarity scores and this combined view are not part of the current release."
    />
  );
}
