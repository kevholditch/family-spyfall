# Contributing to Family Spyfall

Thank you for your interest in contributing to Family Spyfall! This document provides guidelines and information for contributors.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/family-spyfall.git
   cd family-spyfall
   ```
3. **Install dependencies**:
   ```bash
   pnpm install
   ```
4. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running the Application

```bash
# Start both server and web app in development mode
pnpm dev

# Or start them separately
pnpm -C apps/server dev
pnpm -C apps/web dev
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run server tests only
pnpm -C apps/server test

# Run E2E tests
pnpm -C apps/web test:e2e
```

### Code Quality

```bash
# Lint all code
pnpm lint

# Lint specific app
pnpm -C apps/server lint
pnpm -C apps/web lint
```

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use proper type annotations
- Avoid `any` type unless absolutely necessary

### React Components

- Use functional components with hooks
- Follow the component structure in existing files
- Use TypeScript interfaces for props
- Implement proper accessibility features

### Server Code

- Use async/await over promises
- Implement proper error handling
- Add input validation and sanitization
- Follow RESTful API conventions

### Testing

- Write unit tests for business logic
- Use property-based testing with fast-check where appropriate
- Write integration tests for API endpoints
- Write E2E tests for critical user flows

## Pull Request Process

1. **Ensure tests pass**:
   ```bash
   pnpm test
   pnpm lint
   ```

2. **Update documentation** if needed

3. **Create a pull request** with:
   - Clear description of changes
   - Reference to any related issues
   - Screenshots for UI changes
   - Testing instructions

4. **Respond to feedback** and make requested changes

## Feature Guidelines

### New Features

- Keep features focused and atomic
- Ensure backward compatibility
- Add appropriate tests
- Update documentation

### Bug Fixes

- Include reproduction steps
- Add tests to prevent regression
- Verify fix doesn't break existing functionality

### Performance

- Profile before optimizing
- Measure impact of changes
- Consider caching strategies
- Optimize for mobile devices

## Accessibility

All contributions should maintain or improve accessibility:

- Use semantic HTML elements
- Provide ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers
- Maintain color contrast ratios

## Security

Security is a top priority:

- Sanitize all user input
- Validate data on both client and server
- Use secure coding practices
- Don't expose sensitive information
- Follow OWASP guidelines

## Code Review

All submissions require review. Reviewers will check:

- Code quality and style
- Test coverage
- Security implications
- Performance impact
- Documentation updates

## Issue Reporting

When reporting issues:

1. **Search existing issues** first
2. **Use the issue template**
3. **Provide detailed information**:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Screenshots if applicable

## Feature Requests

For feature requests:

1. **Check existing requests**
2. **Describe the use case**
3. **Explain the benefit**
4. **Consider implementation complexity**

## Release Process

Releases are managed by maintainers:

1. Features are merged to `develop`
2. Regular releases from `develop` to `main`
3. Tagged releases with semantic versioning
4. Release notes published

## Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Follow the code of conduct
- Provide constructive feedback

## Getting Help

- Check the README for common issues
- Search existing issues and discussions
- Ask questions in GitHub Discussions
- Join our community chat (if available)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Family Spyfall! 🎉
