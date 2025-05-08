import { useState, useEffect, useRef } from 'react'
import type React from 'react'
import { cn } from '../../lib/utils'
import { Tag, X, Link as LinkIcon } from './Icons'
import { motion, AnimatePresence } from 'framer-motion'
import { getPath } from '../../lib/path'

// Define the type for a single tag
type TagItem = {
    id: string
    label: string
    count?: number
    slug?: string // 用于链接到博客标签页
}

// Define the props for the KeywordCloud component
export interface KeywordCloudProps {
    tags: TagItem[]
    baseUrl?: string // 博客标签页的基础URL
}

const KeywordCloudReact: React.FC<KeywordCloudProps> = ({
    tags,
    baseUrl = '/blog/tag',
}) => {
    const [selectedTags, setSelectedTags] = useState<TagItem[]>([])
    const selectedsContainerRef = useRef<HTMLDivElement>(null)

    const removeSelectedTag = (id: string) => {
        setSelectedTags((prev) => prev.filter((tag) => tag.id !== id))
    }

    const addSelectedTag = (tag: TagItem) => {
        setSelectedTags((prev) => [...prev, tag])
    }

    const selectedTagsLength = selectedTags.length;
    
    useEffect(() => {
        if (selectedsContainerRef.current) {
            selectedsContainerRef.current.scrollTo({
                left: selectedsContainerRef.current.scrollWidth,
                behavior: 'smooth',
            })
        }
    }, [selectedTagsLength])

    // 动画变体
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    }

    const tagVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                stiffness: 300,
                damping: 20,
            },
        },
        exit: {
            scale: 0.8,
            opacity: 0,
            transition: {
                duration: 0.3,
                ease: 'easeInOut',
            },
        },
        hover: {
            scale: 1.05,
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
            transition: {
                duration: 0.2,
            },
        },
    }

    return (
        <div className="container mx-auto py-12">
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">关键词云</h2>
                <p className="text-base-content/70">
                    选择关键词以对内容进行分类，点击可查看相关博客
                </p>
            </div>
            <div className="p-6 max-w-full w-full flex flex-col border rounded-lg">
                <motion.h3
                    layout
                    className="text-lg font-semibold mb-4 flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <Tag className="h-4 w-4" />
                    已选关键词
                </motion.h3>
                <motion.div
                    className="w-full flex items-center justify-start gap-1.5 bg-base-100 border h-16 mb-6 overflow-x-auto p-1.5 rounded-md"
                    ref={selectedsContainerRef}
                    layout
                >
                    <AnimatePresence>
                        {selectedTags.length === 0 && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-base-content/50 text-sm p-2"
                            >
                                未选择关键词。从下方选择。
                            </motion.p>
                        )}

                        {selectedTags.map((tag) => (
                            <motion.div
                                key={tag.id}
                                className="flex items-center gap-1 pl-3 pr-1 py-1 bg-base-100 shadow-sm border h-10 shrink-0 rounded-md"
                                layoutId={`tag-${tag.id}`}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                variants={tagVariants}
                                whileHover="hover"
                            >
                                <motion.span
                                    layoutId={`tag-${tag.id}-label`}
                                    className="text-base-content font-medium"
                                >
                                    {tag.label}
                                </motion.span>
                                <div className="flex gap-1">
                                    <a
                                        href={getPath(`${baseUrl}/${tag.id}`)}
                                        className="p-1 rounded-full hover:bg-base-200 text-primary"
                                        title="查看相关博客文章"
                                    >
                                        <LinkIcon className="size-4" />
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeSelectedTag(tag.id)
                                        }
                                        className="p-1 rounded-full hover:bg-base-200"
                                    >
                                        <X className="size-4 text-base-content/70" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>

                <motion.div
                    className="bg-base-100 shadow-sm border w-full rounded-md p-4"
                    layout
                    transition={{ duration: 0.5 }}
                >
                    <motion.h3
                        layout
                        className="text-lg font-semibold mb-4 flex items-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <Tag className="h-4 w-4" />
                        可用关键词
                    </motion.h3>
                    <motion.div
                        className="flex flex-wrap gap-2"
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                    >
                        <AnimatePresence>
                            {tags
                                .filter(
                                    (tag) =>
                                        !selectedTags.some(
                                            (selected) => selected.id === tag.id
                                        )
                                )
                                .map((tag) => (
                                    <motion.button
                                        type="button"
                                        key={tag.id}
                                        layoutId={`tag-${tag.id}`}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        variants={tagVariants}
                                        whileHover="hover"
                                        className="flex items-center gap-2 px-4 py-2 bg-base-200 rounded-full shrink-0 hover:bg-base-300 transition-colors"
                                        onClick={() => addSelectedTag(tag)}
                                    >
                                        <motion.span
                                            layoutId={`tag-${tag.id}-label`}
                                            className="text-base-content font-medium"
                                        >
                                            {tag.label}
                                        </motion.span>
                                        {tag.count && (
                                            <span className="badge badge-sm badge-primary">
                                                {tag.count}
                                            </span>
                                        )}
                                    </motion.button>
                                ))}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>

                <motion.div
                    className="mt-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <h3 className="text-lg font-semibold mb-4">关联博客</h3>
                    {selectedTags.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedTags.map((tag) => (
                                <motion.a
                                    key={`blog-${tag.id}`}
                                    href={getPath(`${baseUrl}/${tag.id}`)}
                                    className="card p-4 border shadow-sm hover:shadow-md transition-shadow"
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    whileHover={{ scale: 1.02 }}
                                >
                                    <div className="flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-primary" />
                                        <span className="font-medium">
                                            {tag.label}
                                        </span>
                                    </div>
                                    <p className="text-sm text-base-content/70 mt-2">
                                        查看与 "{tag.label}" 相关的所有博客文章
                                    </p>
                                </motion.a>
                            ))}
                        </div>
                    ) : (
                        <p className="text-base-content/70 p-4 border rounded-md">
                            选择关键词以查看相关博客文章
                        </p>
                    )}
                </motion.div>
            </div>
        </div>
    )
}

export default KeywordCloudReact
