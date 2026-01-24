# GitHub Pages Deployment Instructions

This project is configured for GitHub Pages deployment in two ways:
1. **Manual deployment** using gh-pages CLI
2. **Automatic deployment** using GitHub Actions (recommended)

## Setup

1. **Update the homepage URL in package.json**
   Replace `USERNAME` with your GitHub username:
   ```json
   "homepage": "https://YOUR_GITHUB_USERNAME.github.io/dw_sitepref_extractor"
   ```

2. **Initialize Git repository (if not already done)**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

3. **Create a GitHub repository**
   - Go to https://github.com/new
   - Name it: `dw_sitepref_extractor`
   - Don't initialize with README (you already have files)
   - Create repository

4. **Connect local repo to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/dw_sitepref_extractor.git
   git branch -M main
   git push -u origin main
   ```

## Option 1: Automatic Deployment with GitHub Actions (Recommended)

This project includes a GitHub Actions workflow that automatically builds and deploys your app when you push to the main branch.

### First-time setup:

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. That's it! The workflow is already configured in `.github/workflows/deploy.yml`

### Usage:

Simply push your changes to the main branch:
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

The GitHub Actions workflow will automatically:
- Install dependencies
- Build the project
- Deploy to GitHub Pages

You can monitor the deployment progress in the **Actions** tab of your repository.

## Option 2: Manual Deployment with gh-pages CLI

Run this command to build and deploy:
```bash
npm run deploy
```

This will:
1. Build the production version (`npm run build`)
2. Push the build folder to the `gh-pages` branch
3. GitHub will automatically serve it

## Access Your App

After deployment, your app will be available at:
```
https://YOUR_GITHUB_USERNAME.github.io/dw_sitepref_extractor
```

Note: It may take a few minutes for the site to be live after the first deployment.

## Update and Redeploy

### With GitHub Actions (automatic):
```bash
git add .
git commit -m "Your commit message"
git push origin main
# Deployment happens automatically
```

### With gh-pages CLI (manual):
```bash
git add .
git commit -m "Your commit message"
git push origin main
npm run deploy
```

## Troubleshooting

- **404 errors**: Make sure the homepage URL in package.json matches your repository name
- **Site not updating**: Clear browser cache or wait a few minutes
- **Build errors**: Check the terminal output during deployment or the Actions tab on GitHub
- **GitHub Actions not running**: 
  - Ensure GitHub Pages is set to use "GitHub Actions" as the source
  - Check the Actions tab for error logs
  - Verify workflow permissions in Settings → Actions → General

