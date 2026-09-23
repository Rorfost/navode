# Navode Platform Compatibility Matrix

This document outlines the compatibility between Navode versions and Platform API versions.

| Navode Version | Platform API Version | Notes                                                                              |
| :------------- | :------------------- | :--------------------------------------------------------------------------------- |
| **v2.2.x**     | **1**                | Initial release of the Platform API. Supports declarative commands and CSS tokens. |
| **v2.x.x**     | **1**                | Full backward compatibility for API v1.                                            |

Plugins targeting `compatiblePlatformApiVersion: 1` will work on all Navode v2.2+ installations.

## Future Plans

When Navode introduces breaking changes to the Platform SDK (e.g. dynamic background workers, new required manifest fields), we will bump the Platform API version to `2`. Navode will maintain support for `v1` plugins for at least 12 months after `v2` is introduced.
