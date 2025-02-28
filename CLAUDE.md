# CLAUDE.md - Named Arguments Project Guide

## Commands
- Build: `npm run build`
- Type check: `npm run type-check`
- Test: `npm test`
- Test single file: `npx vitest test/index.test.ts`
- Test specific test: `npx vitest -t "test name pattern"`
- Clean: `npm run clean`
- Dev server: `npm run dev`

## Code Style Guidelines
- Use TypeScript with strict type checking
- Use named exports instead of default exports
- Follow explicit type annotations for function parameters
- Use camelCase for variables, functions, and parameters
- Follow functional programming paradigms when possible
- Avoid side effects in functions
- Document public APIs with JSDoc comments
- Include detailed examples in documentation
- Keep functions focused and small
- Error handling: use helpful error messages with clear failure contexts
- Write comprehensive tests for all functionality

This repository is a TypeScript library providing named arguments functionality for JavaScript/TypeScript functions.