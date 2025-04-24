# Personal Blog Project Specification (Astro SSG)

## 1. Project Overview

### 1.1 Project Background

To build a **sustainably evolvable technical content platform** for computer science students using a Static Site Generator (SSG) approach. The platform aims for low infrastructure cost, automated DevOps via Git workflows, and a scalable architecture. Focus on technical knowledge management and professional competency demonstration.

### 1.2 Core Objectives

- Implement an SSG (Astro) workflow to automatically convert Markdown content into a static website.
- Establish a seamless Git-based CI/CD pipeline using GitHub Actions and Vercel for deployment.
- Provide essential content interaction features (comments, search) suitable for a technical blog.
- Utilize **Cost-Effective Infrastructure (Vercel Free Tier) + Automated DevOps (GitHub Actions) + Scalable Architecture (Static CDN)**.

## 2. Functional Requirements

### 2.1 Content Management

#### 2.1.1 Content Storage & Format

- **Primary Source:** GitHub repository.
- **Format:** Standard Markdown (`.md`) or MDX (`.mdx`) with YAML Front Matter for metadata (e.g., `title`, `pubDate`, `description`, `tags`, `author`).
- **Organization:**
    ```
    /src
      /content
        /blog/   # Collection for blog posts
          YYYY-MM-DD-slug.mdx
        /config.ts # Defines content collections
    /src
      /assets/  # Static assets processed by Astro
        /images/
    /public/    # Static assets copied directly
      /images/
    ```

#### 2.1.2 Content Publishing Workflow (CI/CD)

- **Platform:** GitHub Actions integrating with Vercel.
- **Triggers:**
    - Push/Merge to `main` branch → Build and deploy to Production (Vercel).
    - Pull Request created/updated → Build and deploy Preview environment (Vercel).
- **Notifications:** Build failures trigger notifications (e.g., email, GitHub Actions status checks).

### 2.2 Core Features (Frontend: Astro + Tailwind CSS)

#### 2.2.1 Content Rendering

- **Engine:** Astro's Markdown/MDX processing.
- **Features:**
    - LaTeX support for mathematical formulas (via Rehype/Remark plugins).
    - Syntax highlighting for code blocks (using Astro's default Shiki or Prism).
    - Automatic Table of Contents (TOC) generation for posts (via Remark/Rehype plugin).
    - Responsive design ensuring readability on desktop and mobile devices.
    - Image optimization (using Astro Assets or manual optimization).

#### 2.2.2 Comments System

- **Implementation:** Giscus (leveraging GitHub Discussions).
- **Integration:** Embed Giscus widget within the blog post layout.
- **Notifications:** Managed via GitHub Discussions subscriptions.

#### 2.2.3 Search

- **Implementation:** Pagefind (client-side search index generated at build time).
- **Integration:** Add Pagefind build step to CI/CD and integrate search UI component in the frontend.
- **Functionality:** Search across post titles and content based on keywords.

#### 2.2.4 Analytics

- **Implementation:** Vercel Analytics (integrated with Vercel hosting) or a privacy-focused alternative like Umami/Plausible.
- **Tracking:** Page views, basic traffic sources.

## 3. Non-Functional Requirements

### 3.1 Performance

- Target high Lighthouse scores (Performance, Accessibility, Best Practices, SEO).
- Fast page loads via static generation and CDN delivery.

### 3.2 Maintainability

- Clean, well-structured code adhering to Astro and Tailwind best practices.
- Utilize TypeScript for improved type safety where applicable (Astro supports it).
- Basic linting and formatting rules enforced (ESLint, Prettier).

### 3.3 Scalability

- Architecture inherently scales horizontally via CDN.
- Content scales as the number of Markdown files grows (build time may increase).

## 4. Risk Mitigation (Refined)

| Risk                    | Solution                                                        |
| :---------------------- | :-------------------------------------------------------------- |
| Data Integrity/Loss     | Primary: Git version history. Backup: Regular Git clones.       |
| Traffic Spikes          | Handled by Vercel's CDN infrastructure.                         |
| Build Failures          | CI/CD notifications, local build testing (`bun run build`).     |
| Vendor Lock-in (Vercel) | Static nature allows relatively easy migration to alternatives. |
| Dependency Updates      | Regular review and updates using `bun update`.                  |
