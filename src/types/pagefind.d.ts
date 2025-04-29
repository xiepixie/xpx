/**
 * 声明 @pagefind/default-ui 模块的类型
 * 这是一个简单的声明，提供基本类型支持
 */

declare module '@pagefind/default-ui' {
    /**
     * PagefindUI 类的接口定义
     */
    export interface PagefindUIOptions {
        /** 要挂载 UI 的元素选择器或 DOM 元素 */
        element: string | HTMLElement
        /** 是否显示图片 */
        showImages?: boolean
        /** 是否显示空过滤器 */
        showEmptyFilters?: boolean
        /** 摘要长度 */
        excerptLength?: number
        /** 是否重置样式 */
        resetStyles?: boolean
        /** UI 文本翻译 */
        translations?: {
            placeholder?: string
            clear_search?: string
            load_more?: string
            search_label?: string
            filters_label?: string
            zero_results?: string
            many_results?: string
            one_result?: string
            searching?: string
            error?: string
            [key: string]: string | undefined
        }
        /** 处理搜索结果的函数 */
        processResult?: (result: unknown) => unknown
        /** 自定义搜索选项 */
        [key: string]: unknown
    }

    /**
     * PagefindUI 类
     */
    export class PagefindUI {
        constructor(options: PagefindUIOptions)
        triggerSearch(query: string): void
    }
}

/**
 * 声明 astro-pagefind 模块的类型
 */
declare module 'astro-pagefind' {
    import type { AstroIntegration } from 'astro'

    export interface SearchResultData {
        url: string
        meta: {
            title: string
            date?: string
            tags?: string | string[]
            [key: string]: unknown
        }
        excerpt: string
        [key: string]: unknown
    }

    export interface SearchResult {
        data(): Promise<SearchResultData>
        id: string
        score: number
        [key: string]: unknown
    }

    interface SearchOptions {
        query: string
        filters?: Record<string, string[]>
        sort?: (a: SearchResult, b: SearchResult) => number
        limit?: number
        [key: string]: unknown
    }

    export interface PagefindOptions {
        /** 搜索页面路径 */
        searchPagePath?: string
        /** 页面索引选项 */
        indexingOptions?: {
            /** 排除选择器 */
            excludeSelectors?: string[]
            [key: string]: unknown
        }
        [key: string]: unknown
    }

    /**
     * astro-pagefind 默认导出的函数
     */
    export default function pagefind(
        options?: PagefindOptions
    ): AstroIntegration

    /**
     * 搜索函数
     */
    export function search(
        options: string | SearchOptions
    ): Promise<SearchResult[]>
}

/**
 * 声明 astro-pagefind/components 模块的类型
 */
declare module 'astro-pagefind/components/Search' {
    import type { AstroComponentFactory } from 'astro/runtime/server'

    interface SearchProps {
        id?: string
        className?: string
        query?: string
        uiOptions?: import('@pagefind/default-ui').PagefindUIOptions
    }

    const Search: AstroComponentFactory<SearchProps>
    export default Search
}
