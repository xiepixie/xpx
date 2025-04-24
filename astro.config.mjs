// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import image from "@astrojs/image";
import react from "@astrojs/react";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeToc from 'rehype-toc';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';


// https://astro.build/config
export default defineConfig({
  site: "https://paxie.github.io/xpx",
  base: "xpx",
  output: "static",
  
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    },
    remarkPlugins: [
      remarkMath, // LaTeX 数学公式支持
      remarkGfm,  // GitHub Flavored Markdown
    ],
    rehypePlugins: [
      rehypeKatex,
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: "append" }],
      // @ts-ignore
      [rehypeToc, { headings: ["h2", "h3"] }]
      
    ]
  },
  
  integrations: [
    mdx({
      syntaxHighlight: 'shiki',
      shikiConfig: {
        theme: 'github-dark',
        wrap: true
      },
      remarkPlugins: [remarkMath, remarkGfm],
      rehypePlugins: [
        rehypeKatex,
        rehypeSlug,
        [rehypeToc, { headings: ['h2', 'h3'] }],
        [rehypeAutolinkHeadings, { behavior: 'append' }],
      ],
    }), 
    sitemap(), 
    image(), 
    react()
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
