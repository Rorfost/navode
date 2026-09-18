# Testing strategy

Use Vitest for domain and API unit tests, React Testing Library for component tests when components gain behavior, and Playwright for important web flows. Test core command parsing and validation independently from React and Chrome APIs. Extension checks include manifest validation, a production build, unpacked loading, new-tab override, and permission review.

Coverage is a signal, not a target. Critical workflows—command execution, persistence/migration, import validation, and new-tab startup—must have meaningful automated tests plus manual checks where browser behavior cannot be automated reliably.
