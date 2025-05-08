// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeToc from 'rehype-toc';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import pkg from "rehype-shiki";
const rehypeShiki = pkg.default || pkg;
import dotenv from 'dotenv';

import { remarkReadingTime } from './remark-reading-time.mjs';
dotenv.config();

// 添加调试输出以验证环境变量加载正确
console.log('[Config] Environment variables loaded:');
console.log('[Config] PUBLIC_USE_BASE_PATH:', process.env.PUBLIC_USE_BASE_PATH);
console.log('[Config] PUBLIC_BASE_PATH:', process.env.PUBLIC_BASE_PATH);

// 更健壮的环境变量解析，处理字符串格式的布尔值
/**
 * @param {any} value
 */
const parseBooleanEnv = (value) => {
  return value === 'true' || value === true || value === '1';
};

// 从环境变量中读取配置
const useBasePath = parseBooleanEnv(process.env.PUBLIC_USE_BASE_PATH);
const basePath = process.env.PUBLIC_BASE_PATH || '';


// 设置Astro配置
// @ts-ignore
export default defineConfig({
  site: "https://xiepixie.github.io",
  // 设置 base 路径 - 如果 PUBLIC_USE_BASE_PATH=true 则使用 PUBLIC_BASE_PATH
  base: useBasePath && basePath ? `/${basePath}` : undefined,
  output: "static",

  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      // 启用换行
      wrap: true,
      // 主题配置 - 使用 Shiki 内置主题
      theme: 'nord',
    },
    remarkPlugins: [ remarkReadingTime, remarkMath, remarkGfm ],
    rehypePlugins: [
      rehypeKatex,
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'append' }],
      // @ts-ignore - Ignoring TypeScript error for rehypeToc configuration
      [rehypeToc, { headings: ['h2', 'h3'] }]
    ]
  },

  integrations: [
    mdx({
      syntaxHighlight: 'shiki',
      shikiConfig: {
        // 启用换行
        wrap: true,
        // 主题配置 - 使用 Shiki 内置主题
        theme: 'nord',
      },
      remarkPlugins: [remarkReadingTime, remarkMath, remarkGfm],
      rehypePlugins: [
        rehypeKatex,
        rehypeSlug,
        // @ts-ignore - Ignoring TypeScript error for rehypeToc configuration
        [rehypeToc, { headings: ['h2', 'h3'] }],
        [rehypeAutolinkHeadings, { behavior: 'append' }],
      ],
    }),
    sitemap(),
    react(),

  ],

  vite: {
    plugins: [tailwindcss()],
    define: {
      // 确保这些变量直接可用于客户端 JavaScript，并使用实际值而不是变量引用
      'import.meta.env.PUBLIC_BASE_PATH': JSON.stringify(process.env.PUBLIC_BASE_PATH || ''),
      'import.meta.env.PUBLIC_USE_BASE_PATH': JSON.stringify(parseBooleanEnv(process.env.PUBLIC_USE_BASE_PATH)),
      'import.meta.env.BASE_URL': JSON.stringify(useBasePath && basePath ? `/${basePath}/` : '/'),
    },
    // 显式地设置环境变量传递
    envPrefix: ['PUBLIC_'],
    // 解决Node.js模块在浏览器中的兼容性问题
    build: {
      rollupOptions: {
        external: ['node:module', 'node:url', 'node:path', 'node:fs', 'node:querystring', 'child_process', 'os', 'path', 'fs'],
      },
    },

  },
});
