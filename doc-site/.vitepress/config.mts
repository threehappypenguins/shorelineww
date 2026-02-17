import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Final Project Docs',
  description: 'Documentation for Final Project Group 3',
  
  // Use '/' for local serving with Live Server (open index.html directly from dist folder)
  base: '/',
  
  srcDir: '.',
  outDir: '.vitepress/dist',
  
  // Use .html extensions for static file serving (Live Server)
  cleanUrls: false,

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guides', link: '/guides/setup-dev-environment.html' },
      { text: 'Project', link: '/guides/requirements.html' },
      { text: 'Frontend Docs', link: '/frontend-docs.html' },
      { text: 'Backend Docs', link: '/api-docs.html' }
    ],
    
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Setup Dev Environment', link: '/guides/setup-dev-environment.html' },
          { text: 'Managing Dev Environment', link: '/guides/managing-dev-environment.html' },
          { text: 'Git Workflow', link: '/guides/git-workflow.html' },
          { text: 'GitHub Notifications', link: '/guides/setup-github-notifications.html' }
        ]
      },
      {
        text: 'Development & Testing',
        items: [
          { text: 'Testing Strategy', link: '/guides/testing-strategy.html' },
          { text: 'Testing', link: '/guides/testing.html' },
          { text: 'TypeDoc Guide', link: '/guides/typedoc-guide.html' }
        ]
      },
      {
        text: 'Project Documentation',
        items: [
          { text: 'Requirements', link: '/guides/requirements.html' },
          { text: 'Architecture', link: '/guides/architecture.html' },
          { text: 'Deployment', link: '/guides/deployment.html' }
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'Frontend', link: '/frontend-docs.html' },
          { text: 'Backend', link: '/api-docs.html' }
        ]
      }
    ],
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/NSCC-ITC-Winter2026-WEBD5020-701-MCr/final-project-group3' }
    ]
  }
})
