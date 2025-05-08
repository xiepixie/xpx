import { defineCollection, z } from 'astro:content'

const blog = defineCollection({
    // Type-check frontmatter using a schema
    schema: z.object({
        title: z.string(),
        publish_date: z.coerce.date(),
        description: z.string().optional(),
        update_date: z.coerce.date().optional(),
        tags: z.array(z.string()).optional(),
        seo_image: z.string().optional(),
        draft: z.boolean().default(false),
        author: z.string().optional(),
    }),
})

export const collections = { blog }
