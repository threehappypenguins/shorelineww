# TypeDoc Setup Guide

This project is configured with TypeDoc to automatically generate API documentation from TSDoc comments in your TypeScript code.

## Quick Start

### Generating Documentation

```bash
pnpm docs
```

This generates HTML documentation in `docs/generated/`. Open `docs/generated/index.html` in your browser to view the documentation.

## TSDoc Comment Syntax

### Basic Function Documentation

```typescript
/**
 * Fetches a project by its ID.
 * @param id - The unique identifier of the project
 * @returns A promise that resolves to the project object
 * @throws {Error} If the project is not found
 * 
 * @example
 * ```typescript
 * const project = await getProject(123);
 * ```
 */
export async function getProject(id: number): Promise<Project> {
  // implementation
}
```

### Class Documentation

```typescript
/**
 * Manages project-related database operations.
 * 
 * @example
 * ```typescript
 * const manager = new ProjectManager();
 * const project = await manager.getById(1);
 * ```
 */
export class ProjectManager {
  /**
   * Retrieves a project by its ID.
   * @param id - The project identifier
   * @returns The project object, or null if not found
   */
  async getById(id: number): Promise<Project | null> {
    // implementation
  }
}
```

### Type/Interface Documentation

```typescript
/**
 * Represents a project in the system.
 * 
 * @property id - Unique identifier
 * @property title - Display title of the project
 * @property description - Detailed description
 * @property tags - Associated project tags
 * @property isActive - Whether the project is visible
 */
export interface Project {
  id: number;
  title: string;
  description: string;
  tags: Tag[];
  isActive: boolean;
}
```

## TSDoc Tags Reference

| Tag | Usage | Example |
|-----|-------|---------|
| `@param` | Document function parameters | `@param userId - The user's ID` |
| `@returns` | Document return value | `@returns A promise resolving to the user` |
| `@throws` | Document exceptions | `@throws {Error} If validation fails` |
| `@example` | Provide usage examples | Wrapped in markdown code blocks |
| `@deprecated` | Mark as outdated | `@deprecated Use newFunction instead` |
| `@internal` | Hide from docs | Hides private implementation details |
| `@see` | Link to related items | `@see {@link otherFunction}` |
| `@link` | Create cross-references | `{@link ProjectManager}` |

## Best Practices

1. **Document Public APIs**: Always add TSDoc comments to exported functions, classes, and interfaces
2. **Include Examples**: Use `@example` tags with realistic usage patterns
3. **Explain Why**: Document the purpose and behavior, not just what it does
4. **Link Related Items**: Use `@see` and `@link` for cross-references
5. **Keep Consistent**: Follow the same style across your codebase

## Configuration

The TypeDoc configuration is in `typedoc.json`:

- **entryPoints**: Source files to document (currently `src/`)
- **out**: Output directory for generated HTML (`docs/generated/`)
- **excludePrivate**: Exclude `private` members
- **excludeInternal**: Exclude members marked with `@internal`
- **excludeExternals**: Exclude external dependencies
- **readme**: Include project README in docs

## Workflow

1. Write TSDoc comments in your code
2. Run `pnpm docs` to generate documentation
3. Review `docs/generated/index.html`
4. Commit documentation updates when merging PRs

## Additional Resources

- [TypeDoc Documentation](https://typedoc.org/)
- [TSDoc Specification](https://tsdoc.org/)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-tags.html)
