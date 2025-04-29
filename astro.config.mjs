// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import sharp from "@astrojs/sharp";
import react from "@astrojs/react";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeToc from 'rehype-toc';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import dotenv from 'dotenv';
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

console.log('[Config] Parsed values:');
console.log('[Config] useBasePath:', useBasePath);
console.log('[Config] basePath:', basePath);
console.log('[Config] Resulting base:', useBasePath && basePath ? `/${basePath}` : 'undefined');

// 设置Astro配置
export default defineConfig({
  site: "https://xiepixie.github.io",
  // 设置 base 路径 - 如果 PUBLIC_USE_BASE_PATH=true 则使用 PUBLIC_BASE_PATH
  base: useBasePath && basePath ? `/${basePath}` : undefined,
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
    // 替换成更新的sharp图像处理集成
    sharp(), 
    react()
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
    envPrefix: ['PUBLIC_']
  },
});
