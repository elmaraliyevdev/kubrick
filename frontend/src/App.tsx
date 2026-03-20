import { getCareerSubdomain } from "@/utils/subdomain";
import CareerApp from "@/CareerApp";
import MainApp from "@/MainApp";

/**
 * Root component — detects subdomain and renders either:
 * - CareerApp for {slug}.kubrick.app (public career pages)
 * - MainApp for app.kubrick.app / localhost (dashboard, auth, etc.)
 */
function App() {
  const careerSlug = getCareerSubdomain();

  if (careerSlug) {
    return <CareerApp orgSlug={careerSlug} />;
  }

  return <MainApp />;
}

export default App;
