**System Specification: GitHub Trending Repositories Intelligence Aggregator**

Act as an expert developer. Based on the following system specification, build a GitHub trending repositories scanner that identifies the top 10 most starred repositories created within the current year, with accurate metadata collection and analytics.

---

## System Overview

A web-based intelligence tool that queries the GitHub REST API to discover, verify, and present the top 10 trending repositories of the week, focusing on repositories created in 2025 or later. The system extracts key metrics (stars, forks, language, description) and synthesizes insights about developer trends.

---

## Architecture

### Data Source
- **Primary API**: GitHub REST API v3
- **Endpoint Pattern**: `GET /search/repositories?q=created:>YYYY-01-01&sort=stars&order=desc&per_page=30`
- **Rate Limiting**: Unauthenticated requests limited to 10 requests/minute; authenticated to 30/minute
- **Base URL**: `https://api.github.com`

### Core Components
1. **Repository Discovery Engine** - Executes sorted search queries against GitHub API
2. **Metadata Extractor** - Pulls individual repo details via `/repos/{owner}/{repo}` endpoint
3. **Data Aggregator** - Compiles ranking table with stars, forks, language, description
4. **Trend Analyzer** - Synthesizes insights about dominant themes and growth patterns

### Query Strategy
- Filter by `created:>2025-01-01` to capture only 2025+ repositories
- Sort by `stars` descending to surface highest-engagement projects
- Pagination at 30 results per request to balance completeness and performance

---

## Data Flow

```
[User Input: "top 10 repo github in week"]
    → [API Query Builder]
    → [GitHub Search API: /search/repositories]
    → [Response Parser: Extract top 30 by stars]
    → [Metadata Enrichment: Individual /repos/{owner}/{repo} calls]
    → [Data Aggregator: Compile top 10 table]
    → [Trend Analysis: Identify dominant categories]
    → [Output: Ranked list + insights]
```

---

## Verified Data Points (as of April 18, 2026)

| Rank | Repository | Stars | Forks | Language | Description |
|------|------------|-------|-------|----------|-------------|
| 1 | `ultraworkers/claw-code` | 185,887 | 108,672 | Rust | "The fastest repo in history to surpass 100K stars" |
| 2 | `obra/superpowers` | 158,442 | 13,788 | Shell | "An agentic skills framework & software development methodology" |
| 3 | `anomalyco/opencode` | 145,315 | 16,472 | TypeScript | "The open source coding agent" (MIT licensed) |
| 4 | `anthropics/skills` | 119,860 | 13,874 | Python | "Public repository for Agent Skills" |
| 5 | `msitarzewski/agency-agents` | ~70K+ | - | - | "A complete AI agency at your fingertips" |
| 6-10 | *Pending verification* | - | - | - | - |

---

## Constraints & Edge Cases

- **Incomplete Results**: GitHub search API may return `incomplete_results: true` for large result sets; compensate with multiple queries or cached data
- **Language Detection**: Some repos report `null` language; handle gracefully
- **Rate Limits**: Implement exponential backoff on 403 responses
- **Data Freshness**: Star counts fluctuate; note retrieval timestamp

---

## Implementation Plan

1. **Phase 1**: Build API client with authentication header support
2. **Phase 2**: Implement search query with date filter and sorting
3. **Phase 3**: Add individual repo metadata enrichment for top candidates
4. **Phase 4**: Create ranking table with visual formatting
5. **Phase 5**: Add trend categorization (AI agents, frameworks, tools)

---

## Expected Output Format

```
🏆 Top 10 GitHub Trending Repositories (Week of [DATE])

1. [REPO_NAME] - [STARS]⭐ | [LANGUAGE] | [DESCRIPTION]
2. [REPO_NAME] - [STARS]⭐ | [LANGUAGE] | [DESCRIPTION]
...
[Trend Analysis Section]
```

---

## Unresolved Areas (Hypothesis)

- Exact star counts for positions 5-10 require additional API calls for verification
- Categorization of repos beyond top 4 is estimated based on description text
- Discord links and community metrics not captured in core dataset

---

Implement this system to maintain accurate, real-time visibility into GitHub's most impactful emerging projects.