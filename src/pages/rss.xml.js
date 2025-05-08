import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";
import { formattedBasePath } from "../lib/config";

export async function GET(context) {
  // 获取所有非草稿文章
  const posts = await getCollection("blog", ({ data }) => {
    return import.meta.env.PROD ? !data.draft : true;
  });

  // 确保链接包含正确的基础路径
  const baseUrl = formattedBasePath;

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      ...post.data,
      link: `${baseUrl}/blog/${post.id}/`,
      pubDate: post.data.publish_date,
    })),
  });
}
