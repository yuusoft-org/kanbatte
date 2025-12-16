---
title: query params for filter and sort
status: done
priority: high
assignee: JeffY
labels: [task]
---

# Description

currently if we add filter and sorts, and copy and share the url, opening the url will always be the default state where it shows all tasks.

we want it that when we update filter and sorts, it will also update query params

## Proposed query params

Based on the existing filter and sort functionality in the site-aggregate codebase, here are the proposed query parameters:

### Sort Parameters
- `sort` - Sort field (one of: `id`, `status`, `workspace`, `priority`, `project`)
- `order` - Sort order (one of: `asc`, `desc`)

Example:
```
?sort=status&order=desc
```

### Filter Parameters
- `q` - Text search only (searches task titles and IDs)
- `workspace` - Filter by workspace name
- `project` - Filter by project name
- `priority` - Filter by priority (one of: `high`, `medium`, `low`)
- `status` - Filter by status (one of: `todo`, `done`)
- `assignee` - Filter by assignee name
- `label` - Filter by label

Example combinations:
```
?workspace=engineering&priority=high&status=todo&q=urgent%20bug
```

### Transition Strategy
The current query syntax supports filters in the search field:
```
workspace:engineering priority:high status:todo search term here
```

**Phase 1: Translate to URL params**
- When user types filter syntax in search, parse and translate to separate URL params
- URL becomes: `?workspace=engineering&priority=high&status=todo&q=search%20term%20here`
- Maintain backward compatibility with existing query parsing

**Phase 2: Migrate to separate filter UI**
- Eventually move filters to dedicated UI components (like sort buttons)
- Search field becomes pure text search only
- URL structure remains consistent

### Implementation Approach

**When user types in search field** (`handleSearchInput`):
```javascript
// Parse both filter syntax and plain text
const parsed = parseSearchQuery(value);
const params = new URLSearchParams();

// Extract filters to separate params
Object.keys(parsed).forEach(key => {
  if (key !== 'text' && parsed[key]) {
    params.set(key, parsed[key]);
  }
});

// Text search goes to q parameter
if (parsed.text.length > 0) {
  params.set('q', parsed.text.join(' '));
}

// Update URL
window.history.pushState({}, '', `?${params.toString()}`);
```

**When user clicks filter buttons** (`handleTaskListClick`):
- Direct update the specific filter parameter
- Clear filter from search field if present

**On page load**:
- Read URL params and reconstruct state
- Build search field content from q param + any active filters

### Benefits of This Approach
1. **Future-proof**: Easy migration to separate filter UI components
2. **Clean URLs**: Individual parameters instead of encoded query syntax
3. **Shareable**: URLs accurately represent filter state
4. **Backward compatible**: Existing query syntax still works during transition

### Default Values
- `sort`: defaults to `status`
- `order`: defaults to `asc`
- `q`: defaults to empty (no text search)
- Filter params: when absent, no filtering applied

### Parameter Validation
- Validate sort field against allowed values
- Validate priority/status against known values
- Handle URL encoding for special characters
- Sanitize input to prevent XSS




