# Testing strategy

Use Vitest for domain and API unit tests, React Testing Library for component tests, and Playwright for important web flows. The web foundation includes a component test and a new-tab shell browser test. Test core command parsing and validation independently from React and Chrome APIs. Extension checks include storage-adapter tests, manifest validation, a production build, unpacked loading, new-tab override, and permission review.

Coverage is a signal, not a target. Critical workflows—command execution, persistence/migration, import validation, and new-tab startup—must have meaningful automated tests plus manual checks where browser behavior cannot be automated reliably.
