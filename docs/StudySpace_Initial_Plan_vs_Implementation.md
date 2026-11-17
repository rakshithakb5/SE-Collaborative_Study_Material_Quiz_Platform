# StudySpace – Initial Plan vs Actual Implementation

| Area | Initial plan (SRS/SAD) | What we implemented / how we deviated |
|---|---|---|
| Data storage | Store application data in a persistent database so it can be shared and retained. | The demonstrator uses in-memory Maps and arrays for some backend data. Some frontend demo features use browser `localStorage`. |
| Audit records | Maintain audit records with long-term retention. | Audit records are currently held in memory; durable long-term retention was not implemented. |
| Notifications | Support email/notification workflows. | The demonstrator uses an in-process notification approach rather than a fully configured external email or push service. |
| Analytics export | Provide instructor analytics with CSV export. | The CSV export functionality is partial and is not a complete export workflow. |
| Security of stored data | Provide encryption at rest as specified in the security design. | Encryption at rest was not evidenced in the final implementation reviewed. |
| Performance | Meet the specified page-performance and concurrent-use targets. | We measured selected page navigation using Playwright and ran a 5,000-virtual-user Artillery test. These results do not prove full page-load performance or 5,000 simultaneously active users. |
| Accessibility | Meet the specified accessibility requirements across the application. | We ran automated accessibility scans on Dashboard, Study Library and Quiz Center. This is limited test coverage, not a full WCAG compliance certification. |

