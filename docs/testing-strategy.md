# Testing Strategy

## Unit Tests

- API route handlers
- Utility functions
- Prisma queries
- Auth logic

## Component Tests

- Gallery rendering
- Drag-and-drop behavior
- Forms

## CI Pipeline

### On every PR:
- install deps
- run lint
- run tests
- build app
- Failing tests block merge.