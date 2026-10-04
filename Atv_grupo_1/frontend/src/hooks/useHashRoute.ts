import { useEffect, useState } from "react";

export function useHashRoute(): string {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    function updateRoute() {
      setRoute(window.location.hash);
    }

    window.addEventListener("hashchange", updateRoute);

    return () => {
      window.removeEventListener("hashchange", updateRoute);
    };
  }, []);

  return route;
}
