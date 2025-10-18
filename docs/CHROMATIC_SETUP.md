# Chromatic Visual Testing Setup

This document outlines the setup and usage of Chromatic for visual regression testing in the X-EAR project.

## Overview

Chromatic is integrated into our CI/CD pipeline to automatically detect visual changes in our Storybook components. It helps maintain visual consistency and catch unintended UI regressions.

## Setup

### 1. Project Configuration

The project is configured with:
- **Chromatic Config**: `.chromatic.config.json` in the project root
- **GitHub Actions**: `.github/workflows/chromatic.yml` for CI integration
- **Package Scripts**: `chromatic` script in `apps/web/package.json`

### 2. Required Secrets

Add the following secrets to your GitHub repository:

1. **CHROMATIC_PROJECT_TOKEN**: Your Chromatic project token
   - Go to [Chromatic.com](https://www.chromatic.com/)
   - Create a new project or use existing one
   - Copy the project token from project settings
   - Add it as a GitHub secret

### 3. Local Development

To run Chromatic locally:

```bash
# From project root
cd apps/web
pnpm chromatic

# Or using the workspace command
pnpm --filter @x-ear/web chromatic
```

## Workflow

### Automatic Testing

Chromatic runs automatically on:
- **Push to main/develop**: Full visual regression testing
- **Pull Requests**: Only tests changed stories for efficiency

### Manual Testing

You can manually trigger Chromatic builds:

```bash
# Test all stories
pnpm chromatic

# Test only changed stories
pnpm chromatic --only-changed

# Skip CI and run locally
pnpm chromatic --skip-ci
```

## Configuration Options

### `.chromatic.config.json`

Key configuration options:

- `exitZeroOnChanges`: Don't fail CI on visual changes
- `onlyChanged`: Only test changed stories on PRs
- `delay`: Wait time before capturing screenshots (300ms)
- `diffThreshold`: Sensitivity for detecting changes (0.2)
- `skip`: Skip builds for specific branches (e.g., dependabot)

### GitHub Actions Workflow

The workflow:
1. Checks out code with full history
2. Sets up Node.js and pnpm
3. Installs dependencies
4. Builds Storybook
5. Publishes to Chromatic

## Best Practices

### Story Writing

1. **Consistent States**: Ensure stories render consistently
2. **Mock Data**: Use stable mock data to avoid flaky tests
3. **Responsive Design**: Test different viewport sizes
4. **Loading States**: Include loading and error states

### Visual Testing

1. **Review Changes**: Always review visual changes in Chromatic UI
2. **Accept Changes**: Accept intentional changes to update baselines
3. **Investigate Regressions**: Investigate unexpected changes
4. **Cross-browser**: Chromatic tests across different browsers

## Troubleshooting

### Common Issues

1. **Build Failures**: Check Storybook builds locally first
2. **Flaky Tests**: Review story consistency and mock data
3. **Large Diffs**: Check for dynamic content or timestamps
4. **Missing Stories**: Ensure stories are properly exported

### Debug Commands

```bash
# Build Storybook locally
pnpm build-storybook

# Run Storybook dev server
pnpm storybook

# Check for TypeScript errors
pnpm type-check
```

## Integration with Development Workflow

### Pull Request Process

1. Create feature branch
2. Add/modify components and stories
3. Push changes (triggers Chromatic build)
4. Review visual changes in Chromatic
5. Accept or fix changes as needed
6. Merge when approved

### Baseline Management

- **Main branch**: Serves as the visual baseline
- **Feature branches**: Compared against main baseline
- **Updates**: Accepting changes updates the baseline

## Resources

- [Chromatic Documentation](https://www.chromatic.com/docs/)
- [Storybook Documentation](https://storybook.js.org/docs/)
- [Visual Testing Best Practices](https://www.chromatic.com/docs/test)

## Support

For issues with Chromatic setup or visual testing:
1. Check this documentation
2. Review Chromatic build logs
3. Contact the development team
4. Create an issue in the project repository