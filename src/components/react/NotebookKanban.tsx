import type React from 'react'
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { cn } from '../../lib/utils'
import { getPath } from '../../lib/path'
import { Avatar, AvatarImage, AvatarFallback } from './Avatar'
import {
    DndContext,
    type DragEndEvent,
    type DragStartEvent,
    type DragOverEvent,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type UniqueIdentifier,
    DragOverlay,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    restrictToWindowEdges,
} from '@dnd-kit/modifiers'

// 颜色映射
const STATUS_COLORS: Record<string, string> = {
    Draft: 'bg-blue-400',
    'In Review': 'bg-yellow-400',
    Published: 'bg-green-400',
    'all': 'bg-gray-400'
}

// 定义TS类型
type Status = {
    id: string
    name: string
    color: string
}

type Owner = {
    id: string
    image: string
    name: string
}

type Note = {
    id: string
    name: string
    status: Status
    owner: Owner
    index: number
    date?: Date // 添加日期字段，用于排序最近发布文章
    url?: string // 添加URL字段，用于跳转链接
}

// 拖拽辅助类型
type DraggingData = {
    active: Note | null
    containerId: UniqueIdentifier | null
    over: UniqueIdentifier | null
}

// 博客文章类型
type BlogPost = {
    id: string;
    title: string;
    publishDate: Date;
    updateDate?: Date;
    tags?: string[];
    url: string;
    draft?: boolean;
}



// 组件props类型
export interface NotebookKanbanProps {
    showStatusButtons?: boolean;
    maxPublishedItems?: number;
    initialStatus?: 'Draft' | 'In Review' | 'Published';
    title?: string;
    description?: string;
    id?: string;
    enableNewTask?: boolean;
    blogPosts?: BlogPost[];
    enableBlogIntegration?: boolean;
}

// 数据存储常量
const LOCAL_STORAGE_KEY = 'notebookKanbanNotes'
const INDEXEDDB_NAME = 'kanbanDatabase'
const INDEXEDDB_VERSION = 1
const NOTES_STORE_NAME = 'kanbanNotes'

// IndexedDB 工具函数
const initializeIndexedDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            console.warn('浏览器不支持 IndexedDB，将回退到 localStorage')
            reject(new Error('IndexedDB not supported'))
            return
        }

        const request = window.indexedDB.open(INDEXEDDB_NAME, INDEXEDDB_VERSION)

        request.onerror = (event) => {
            console.error('IndexedDB 打开失败:', event)
            reject(new Error('Failed to open IndexedDB'))
        }

        request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            resolve(db)
        }

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result

            // 创建对象存储（如果不存在）
            if (!db.objectStoreNames.contains(NOTES_STORE_NAME)) {
                db.createObjectStore(NOTES_STORE_NAME, { keyPath: 'id' })
            }
        }
    })
}

// 保存笔记到 IndexedDB
const saveNotesToIndexedDB = async (notes: Note[]): Promise<void> => {
    try {
        const db = await initializeIndexedDB()
        const transaction = db.transaction([NOTES_STORE_NAME], 'readwrite')
        const store = transaction.objectStore(NOTES_STORE_NAME)

        // 清空现有数据
        store.clear()

        // 存储时将 Date 对象转换为 ISO 字符串
        const notesToStore = notes.map(note => ({
            ...note,
            date: note.date?.toISOString(),
        }))

        // 添加所有笔记
        for (const note of notesToStore) {
            store.add(note)
        }

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                resolve()
            }

            transaction.onerror = (event) => {
                console.error('保存笔记到 IndexedDB 失败:', event)
                reject(new Error('Failed to save notes to IndexedDB'))
            }
        })
    } catch (error) {
        console.error('IndexedDB 操作失败，回退到 localStorage:', error)
        // 回退到 localStorage
        try {
            const notesToStore = notes.map(note => ({
                ...note,
                date: note.date?.toISOString(),
            }))
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notesToStore))
        } catch (localStorageError) {
            console.error('保存到 localStorage 也失败:', localStorageError)
        }
    }
}

// 从 IndexedDB 加载笔记
const loadNotesFromIndexedDB = async (statuses: Status[]): Promise<Note[] | null> => {
    try {
        const db = await initializeIndexedDB()
        const transaction = db.transaction([NOTES_STORE_NAME], 'readonly')
        const store = transaction.objectStore(NOTES_STORE_NAME)
        const request = store.getAll()

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const notes = request.result
                if (notes && notes.length > 0) {
                    // 将存储的日期字符串转换回 Date 对象
                    const parsedNotes = notes.map((note: any) => {
                        // 确保所有必需的字段都存在
                        const parsedNote: Note = {
                            id: note.id || `note-${Math.random().toString(36).substring(2, 11)}`,
                            name: note.name || 'Untitled Note',
                            status: statuses.find(s => s.name === (note.status as any)?.name) || statuses[0],
                            owner: note.owner || { id: 'unknown', image: '', name: 'Unknown' },
                            index: typeof note.index === 'number' ? note.index : 0,
                            date: typeof note.date === 'string' ? new Date(note.date) : undefined,
                            url: typeof note.url === 'string' ? note.url : undefined
                        };
                        return parsedNote;
                    })
                    resolve(parsedNotes)
                } else {
                    resolve(null)
                }
            }

            request.onerror = (event) => {
                console.error('从 IndexedDB 加载笔记失败:', event)
                reject(new Error('Failed to load notes from IndexedDB'))
            }
        })
    } catch (error) {
        console.error('IndexedDB 操作失败，回退到 localStorage:', error)
        return null
    }
}

// 排序列表分组
const ListGroup = ({
    id,
    status,
    notes,
    onStatusChange,
    className,
}: {
    id: string
    status: Status
    notes: Note[]
    onStatusChange?: (noteId: string, targetStatus: Status) => void
    className?: string
}) => {
    return (
        <div
            className={cn(
                'bg-base-100 rounded-lg border border-base-300 shadow-sm transition-all duration-200',
                className
            )}
        >
            <ListHeader
                name={status.name}
                count={notes.length}
                color={STATUS_COLORS[status.name] || 'bg-gray-400'}
            />

            <SortableContext
                id={id}
                items={notes.map((note) => note.id)}
                strategy={verticalListSortingStrategy}
            >
                <ListItems>
                    {notes.map((note) => (
                        <SortableNote
                            key={note.id}
                            note={note}
                            onStatusChange={onStatusChange}
                            possibleStatuses={[
                                {
                                    id: '1',
                                    name: 'Draft',
                                    color: 'draft'
                                },
                                {
                                    id: '2',
                                    name: 'In Review',
                                    color: 'in-review',
                                },
                                {
                                    id: '3',
                                    name: 'Published',
                                    color: 'published',
                                },
                            ]}
                        />
                    ))}
                </ListItems>
            </SortableContext>
        </div>
    )
}

// 列表头部组件
const ListHeader = ({
    name,
    count,
    color = 'bg-gray-400',
    className,
}: {
    name: string
    count: number
    color?: string
    className?: string
}) => {
    // 使用 useMemo 确保服务端和客户端渲染一致
    const displayCount = useMemo(() => {
        return count;
    }, [count]);

    return (
        <div
            className={cn(
                'flex justify-between items-center bg-base-200 p-3 rounded-t-lg',
                className
            )}
        >
            <div className="flex items-center gap-2">
                <div className={cn('h-3 w-3 rounded-full', color)} />
                <p className="font-semibold text-sm">{name}</p>
            </div>
            <div className="badge badge-sm">{displayCount}</div>
        </div>
    );
}

// 列表项容器
const ListItems = ({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) => (
    <div className={cn('flex flex-col gap-2 p-3 min-h-[100px]', className)}>
        {children}
    </div>
)

// 状态切换按钮
const StatusChangeButton = ({
    currentStatus,
    targetStatus,
    onClick,
}: {
    currentStatus: Status
    targetStatus: Status
    onClick: () => void
}) => {
    if (currentStatus.name === targetStatus.name) return null

    // 只允许按照Draft -> In Review -> Published的顺序
    if (
        (currentStatus.name === 'Draft' && targetStatus.name === 'In Review') ||
        (currentStatus.name === 'In Review' &&
            targetStatus.name === 'Published')
    ) {
        return (
            <button
                type="button"
                onClick={onClick}
                className="btn btn-xs btn-ghost text-xs p-1"
                title={`移动到 ${targetStatus.name}`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    role="img"
                >
                    <polyline points="9 18 15 12 9 6" />
                </svg>
                <span className="sr-only">移动到 {targetStatus.name}</span>
            </button>
        )
    }

    return null
}

// 格式化日期函数
const formatDate = (date?: Date): string => {
    if (!date) return '';

    // 检查日期是否有效
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    // 使用中文格式化日期
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

// 可排序的卡片组件
const SortableNote = ({
    note,
    onStatusChange,
    possibleStatuses,
}: {
    note: Note
    onStatusChange?: (noteId: string, targetStatus: Status) => void
    possibleStatuses: Status[]
}) => {
    const handleNoteClick = () => {
        if (note.status.name === 'Published' && note.url) {
            // 使用 getPath 处理 URL，确保包含正确的基础路径
            const processedUrl = getPath(note.url);
            window.open(processedUrl, '_blank');
        }
    };
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: note.id,
        data: {
            type: 'note',
            note,
        },
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 0,
    }

    // 格式化日期显示
    const formattedDate = formatDate(note.date);

    // 判断是否为博客文章（ID以blog-开头）
    const isBlogPost = note.id.startsWith('blog-');

    return (
        <article
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                'card border bg-base-100 p-3 shadow-sm transition-all duration-200 group',
                'cursor-grab hover:shadow-md hover:scale-[1.02] active:scale-[1.02]',
                isDragging ? 'opacity-50 rotate-1 border-primary' : '',
                note.status.name === 'Published' ? 'cursor-pointer' : '',
                isBlogPost ? 'border-primary/30' : ''
            )}
            onClick={handleNoteClick}
            aria-label={`任务: ${note.name}, 状态: ${note.status.name}`}
        >
            <div className="relative">
                <NoteContent note={note} />

                {/* 日期显示 */}
                {formattedDate && (
                    <div className="text-xs text-base-content/60 mt-2 flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 mr-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <time dateTime={note.date?.toISOString()}>{formattedDate}</time>
                    </div>
                )}

                {/* 发布文章链接按钮 */}
                {note.status.name === 'Published' && note.url && (
                    <a
                        href={getPath(note.url)}
                        className="absolute -right-2 -top-2 bg-primary/90 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`查看文章: ${note.name}`}
                    >
                        <span className="sr-only">查看文章: {note.name}</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            role="img"
                        >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                    </a>
                )}

                {/* 博客文章标识 */}
                {isBlogPost && (
                    <div className="absolute -left-2 -top-2">
                        <div className="badge badge-primary badge-sm">博客</div>
                    </div>
                )}
            </div>

            {onStatusChange && (
                <div className="flex justify-end mt-2">
                    {possibleStatuses.map((status) => (
                        <StatusChangeButton
                            key={status.id}
                            currentStatus={note.status}
                            targetStatus={status}
                            onClick={() => onStatusChange(note.id, status)}
                        />
                    ))}
                </div>
            )}
        </article>
    )
}

// 卡片内容组件，复用于拖拽覆盖层
const NoteContent = ({ note }: { note: Note }) => (
    <div className="flex items-center gap-2">
        <div className="cursor-grab mr-1 text-base-content/50">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                role="img"
                aria-label="拖拽手柄"
            >
                <path d="M7 2a1 1 0 01.117 1.993L7 4H5v12h7.414l2-2H9a1 1 0 01-.117-1.993L9 12h6.586l.707-.707a1 1 0 01.707-.293H17V4h-2a1 1 0 01-.117-1.993L15 2h3a1 1 0 01.993.883L19 3v10a1 1 0 01-.293.707l-3 3A1 1 0 0115 17H5a1 1 0 01-.993-.883L4 16V4H2a1 1 0 01-.117-1.993L2 2h5z" />
            </svg>
        </div>

        <div
            className={cn(
                'h-3 w-3 shrink-0 rounded-full',
                STATUS_COLORS[note.status.name] || 'bg-gray-400'
            )}
        />
        <p className="flex-1 font-medium text-sm">{note.name}</p>
        <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={note.owner.image} alt={note.owner.name} />
            <AvatarFallback>
                {note.owner.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
        </Avatar>
    </div>
)

// 新建任务对话框组件
const NewTaskDialog = ({
    isOpen,
    onClose,
    onSave,
    statuses,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (taskName: string, statusId: string) => void;
    statuses: Status[];
}) => {
    const [taskName, setTaskName] = useState('')
    const [selectedStatus, setSelectedStatus] = useState(statuses[0].id)
    const dialogRef = useRef<HTMLDialogElement>(null)
    const taskNameInputId = 'task-name-input'
    const statusSelectId = 'status-select-input'

    useEffect(() => {
        const dialog = dialogRef.current
        if (dialog) {
            if (isOpen) {
                dialog.showModal()
                // 重置表单
                setTaskName('')
                setSelectedStatus(statuses[0].id)
            } else {
                dialog.close()
            }
        }
    }, [isOpen, statuses])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (taskName.trim()) {
            onSave(taskName.trim(), selectedStatus)
            onClose()
        }
    }

    return (
        <dialog
            ref={dialogRef}
            className="modal modal-bottom sm:modal-middle"
            onClose={onClose}
            aria-labelledby="dialog-title"
        >
            <div className="modal-box">
                <h3 id="dialog-title" className="font-bold text-lg mb-4">创建新任务</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-control w-full mb-4">
                        <label htmlFor={taskNameInputId} className="label">
                            <span className="label-text">任务名称</span>
                        </label>
                        <input
                            id={taskNameInputId}
                            type="text"
                            placeholder="输入任务名称"
                            className="input input-bordered w-full"
                            value={taskName}
                            onChange={(e) => setTaskName(e.target.value)}
                            // 不使用 autoFocus 以避免可访问性问题
                            // 移除 spellcheck 和 data-ms-editor 属性以避免水合不匹配
                        />
                    </div>

                    <div className="form-control w-full mb-6">
                        <label htmlFor={statusSelectId} className="label">
                            <span className="label-text">初始状态</span>
                        </label>
                        <select
                            id={statusSelectId}
                            className="select select-bordered w-full"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            {statuses.map((status) => (
                                <option key={status.id} value={status.id}>
                                    {status.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="modal-action">
                        <button
                            type="button"
                            className="btn"
                            onClick={onClose}
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!taskName.trim()}
                        >
                            创建
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button type="button" onClick={onClose}>关闭</button>
            </form>
        </dialog>
    )
}

const NotebookKanbanReact: React.FC<NotebookKanbanProps> = ({
    showStatusButtons = true,
    maxPublishedItems = 10,
    initialStatus = 'Draft',
    title = "看板任务",
    description = "跟踪和管理您的写作任务",
    id = "main-kanban",
    enableNewTask = true,
    blogPosts = [],
    enableBlogIntegration = true,
}) => {
    // 定义状态类型
    const statuses: Status[] = [
        { id: '1', name: 'Draft', color: 'draft' },
        { id: '2', name: 'In Review', color: 'in-review' },
        { id: '3', name: 'Published', color: 'published' },
    ]

    // 使用固定日期避免水合不匹配 - 使用useMemo确保引用不变
    const getFixedDate = useMemo(() => () => {
        // 使用固定日期字符串，确保服务端和客户端渲染一致
        return new Date('2025-04-14T12:00:00Z');
    }, [])

    // 使用initialStatus过滤初始视图 - 使用useMemo确保服务端和客户端渲染一致
    const [activeStatus, setActiveStatus] = useState<string>(initialStatus)

    // 新任务对话框状态
    const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false)

    // 主题状态
    const [currentTheme, setCurrentTheme] = useState<string>('winter')

    // 监听主题变化
    useEffect(() => {
        if (typeof window === 'undefined') return

        // IndexedDB配置
        const DB_NAME = 'xpxBlogThemeDB';
        const DB_VERSION = 1;
        const THEME_STORE = 'themes';
        const THEME_KEY = 'currentTheme';
        const DEFAULT_THEME = 'winter';

        // 从IndexedDB获取主题
        const getThemeFromIndexedDB = async (): Promise<string> => {
            try {
                return new Promise((resolve, reject) => {
                    try {
                        const request = indexedDB.open(DB_NAME, DB_VERSION);

                        request.onerror = () => {
                            console.error('[NotebookKanban] 打开IndexedDB失败，尝试备用方法');
                            resolve(getFallbackTheme());
                        };

                        request.onsuccess = (event) => {
                            try {
                                const db = (event.target as IDBOpenDBRequest).result;
                                const transaction = db.transaction([THEME_STORE], 'readonly');
                                const store = transaction.objectStore(THEME_STORE);
                                const getRequest = store.get(THEME_KEY);

                                getRequest.onsuccess = (event) => {
                                    const result = (event.target as IDBRequest).result;
                                    if (result && result.value) {
                                        resolve(result.value);
                                    } else {
                                        resolve(getFallbackTheme());
                                    }
                                };

                                getRequest.onerror = () => {
                                    resolve(getFallbackTheme());
                                };

                                transaction.oncomplete = () => {
                                    db.close();
                                };
                            } catch (error) {
                                console.error('[NotebookKanban] IndexedDB事务错误:', error);
                                resolve(getFallbackTheme());
                            }
                        };
                    } catch (error) {
                        console.error('[NotebookKanban] IndexedDB操作失败:', error);
                        resolve(getFallbackTheme());
                    }
                });
            } catch (error) {
                console.error('[NotebookKanban] 获取主题过程中出错:', error);
                return getFallbackTheme();
            }
        };

        // 获取备用主题（从localStorage或cookie）
        const getFallbackTheme = (): string => {
            try {
                // 尝试从localStorage获取
                const localTheme = localStorage.getItem('theme');
                if (localTheme) {
                    return localTheme;
                }

                // 尝试从cookie获取
                const themeCookie = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('theme='));

                if (themeCookie) {
                    return themeCookie.split('=')[1];
                }
            } catch (e) {
                console.error('[NotebookKanban] 获取备用主题失败:', e);
            }

            // 默认主题
            return DEFAULT_THEME;
        };

        // 初始化主题
        const initTheme = async () => {
            try {
                const theme = await getThemeFromIndexedDB();
                setCurrentTheme(theme);
            } catch (error) {
                console.error('[NotebookKanban] 初始化主题失败:', error);
                setCurrentTheme(DEFAULT_THEME);
            }
        };

        // 设置初始主题
        initTheme();

        // 监听主题变化事件
        const handleThemeChange = (e: CustomEvent) => {
            setCurrentTheme(e.detail.theme);
        };

        document.addEventListener('theme-changed', handleThemeChange as EventListener);

        return () => {
            document.removeEventListener('theme-changed', handleThemeChange as EventListener);
        };
    }, [])

    // 生成默认笔记数据
    const generateDefaultNotes = useCallback((): Note[] => {
        // 基本默认数据
        const baseDefaultNotes: Note[] = [
            {
                id: 'note-1',
                name: '10 Tips for Better Writing',
                status: statuses[0],
                owner: { id: 'user-1', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=1', name: 'Alex Johnson' },
                index: 0, date: getFixedDate()
            },
            {
                id: 'note-2',
                name: 'The Future of AI in Content Creation',
                status: statuses[1],
                owner: { id: 'user-2', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=2', name: 'Sam Smith' },
                index: 0, date: getFixedDate()
            },
            {
                id: 'note-3',
                name: 'How to Build a Successful Blog',
                status: statuses[2],
                owner: { id: 'user-3', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=3', name: 'Taylor Brown' },
                index: 0, date: getFixedDate(),
                url: 'blog/how-to-build-a-successful-blog'
            },
            {
                id: 'note-4',
                name: 'SEO Strategies for 2023',
                status: statuses[0],
                owner: { id: 'user-4', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=4', name: 'Jordan Lee' },
                index: 1, date: getFixedDate()
            },
            {
                id: 'note-5',
                name: 'Content Marketing Essentials',
                status: statuses[1],
                owner: { id: 'user-5', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=5', name: 'Casey Morgan' },
                index: 1, date: getFixedDate()
            },
        ]

        // 如果启用了博客集成并且有博客文章，则添加博客文章作为已发布的笔记
        if (enableBlogIntegration && blogPosts.length > 0) {
            const blogNotes = blogPosts
                .filter(post => !post.draft) // 过滤掉草稿
                .map((post, index) => ({
                    id: `blog-${post.id}`,
                    name: post.title,
                    status: statuses[2], // Published
                    owner: {
                        id: 'user-blog',
                        image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=blog',
                        name: 'Blog Author'
                    },
                    index,
                    date: post.publishDate,
                    url: post.url
                }))

            return [...baseDefaultNotes, ...blogNotes]
        }

        // 如果没有博客集成或没有博客文章，则使用默认的已发布笔记
        return [
            ...baseDefaultNotes,
            {
                id: 'note-6',
                name: 'The Art of Storytelling',
                status: statuses[2],
                owner: { id: 'user-1', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=6', name: 'Alex Johnson' },
                index: 1, date: getFixedDate(),
                url: 'blog/the-art-of-storytelling'
            },
            {
                id: 'note-7',
                name: 'Video Marketing Trends',
                status: statuses[2],
                owner: { id: 'user-2', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=7', name: 'Sam Smith' },
                index: 2, date: getFixedDate(),
                url: 'blog/video-marketing-trends',
            },
            {
                id: 'note-8',
                name: 'Social Media Strategy',
                status: statuses[2],
                owner: { id: 'user-3', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=8', name: 'Taylor Brown' },
                index: 3, date: getFixedDate(),
                url: 'blog/social-media-strategy'
            },
            {
                id: 'note-9',
                name: 'Email Newsletter Best Practices',
                status: statuses[2],
                owner: { id: 'user-4', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=9', name: 'Jordan Lee' },
                index: 4, date: getFixedDate(),
                url: 'blog/email-newsletter-best-practices'
            },
            {
                id: 'note-10',
                name: 'Mobile-First Content Strategy',
                status: statuses[2],
                owner: { id: 'user-5', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=10', name: 'Casey Morgan' },
                index: 5, date: getFixedDate(),
                url: 'blog/mobile-first-content-strategy'
            },
        ]
    }, [enableBlogIntegration, blogPosts, getFixedDate])

    // 笔记数据状态 - 优先从 IndexedDB 加载，回退到 localStorage
    const [notes, setNotes] = useState<Note[]>(() => {
        // 确保这段代码只在客户端运行
        if (typeof window === 'undefined') {
            return generateDefaultNotes();
        }

        // 返回默认值，实际加载将在 useEffect 中进行
        return generateDefaultNotes();
    });

    // 加载数据
    useEffect(() => {
        const loadNotes = async () => {
            if (typeof window === 'undefined') return;

            try {
                // 尝试从 IndexedDB 加载
                const loadedNotes = await loadNotesFromIndexedDB(statuses);

                if (loadedNotes) {
                    // 如果从 IndexedDB 加载成功
                    setNotes(loadedNotes);
                    return;
                }

                // 如果 IndexedDB 没有数据，尝试从 localStorage 加载
                const storedNotes = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (storedNotes) {
                    try {
                        const parsedNotes = JSON.parse(storedNotes);
                        if (Array.isArray(parsedNotes) && parsedNotes.length > 0 && parsedNotes[0].id) {
                            // 将存储的日期字符串转换回 Date 对象
                            const validNotes = parsedNotes.map((note: Partial<Note>) => ({
                                id: note.id || `note-${Math.random().toString(36).substring(2, 11)}`,
                                name: note.name || 'Untitled Note',
                                ...note,
                                status: statuses.find(s => s.name === note.status?.name) || statuses[0],
                                owner: note.owner || { id: 'unknown', image: '', name: 'Unknown' },
                                date: note.date ? new Date(note.date) : undefined,
                                index: typeof note.index === 'number' ? note.index : 0,
                                url: note.url ? (note.url.startsWith('/') ? note.url.substring(1) : note.url) : undefined
                            }));
                            setNotes(validNotes);
                            return;
                        }
                    } catch (parseError) {
                        console.error("Error parsing notes from localStorage:", parseError);
                    }
                }

                // 如果都没有数据，使用默认数据
                setNotes(generateDefaultNotes());
            } catch (error) {
                console.error("Error loading notes:", error);
                setNotes(generateDefaultNotes());
            }
        };

        loadNotes();
    }, [generateDefaultNotes]);

    // 使用 useEffect 将状态同步到 IndexedDB 和 localStorage
    useEffect(() => {
        // 确保这段代码只在客户端运行
        if (typeof window === 'undefined' || notes.length === 0) {
            return;
        }

        // 保存到 IndexedDB
        saveNotesToIndexedDB(notes).catch(error => {
            console.error("Error saving notes to IndexedDB:", error);

            // 如果 IndexedDB 保存失败，回退到 localStorage
            try {
                const notesToStore = notes.map(note => ({
                    ...note,
                    date: note.date?.toISOString(),
                }));
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notesToStore));
            } catch (localStorageError) {
                console.error("Error saving notes to localStorage:", localStorageError);
            }
        });
    }, [notes]);

    // 拖拽状态
    const [draggingData, setDraggingData] = useState<DraggingData>({
        active: null,
        containerId: null,
        over: null,
    })

    // 分类笔记并按索引排序
    const sortedNotesByStatus = useMemo(() => {
        const result: Record<string, Note[]> = {}

        for (const status of statuses) {
            let statusNotes = notes
                .filter((note: Note) => note.status.name === status.name)
                .sort((a: Note, b: Note) => a.index - b.index)

            // 对于Published状态，按索引排序，但限制为最近的10篇
            if (status.name === 'Published') {
                // 保持拖拽的排序，但限制数量
                statusNotes = statusNotes.slice(0, maxPublishedItems)
            }

            result[status.name] = statusNotes
        }

        return result
    }, [notes, maxPublishedItems])

    // 配置传感器
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px of movement required before activation
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 8,
            },
        })
    )

    // 辅助函数：重新计算所有笔记在各自列中的索引
    const reindexNotes = (notesToIndex: Note[]): Note[] => {
        const statusGroups: { [key: string]: Note[] } = {};

        // 初始化状态组
        for (const status of statuses) {
            statusGroups[status.name] = [];
        }

        // 分组并按现有 index 排序
        for (const note of notesToIndex) {
            if (statusGroups[note.status.name]) {
                statusGroups[note.status.name].push(note);
            }
        }

        // 为每个分组重新计算索引
        const reindexedNotes: Note[] = [];

        for (const statusName of Object.keys(statusGroups)) {
            // 直接按传入的顺序分配索引，不排序
            const groupNotes = statusGroups[statusName];

            for (let newIndex = 0; newIndex < groupNotes.length; newIndex++) {
                reindexedNotes.push({
                    ...groupNotes[newIndex],
                    index: newIndex, // 重新分配连续索引
                });
            }
        }

        return reindexedNotes;
    };

    // 手动更改状态
    const handleStatusChange = (noteId: string, targetStatus: Status) => {
        setNotes((prevNotes) => { // 使用函数式更新
            const noteIndex = prevNotes.findIndex((note) => note.id === noteId);
            if (noteIndex === -1) return prevNotes;

            // 计算目标列的新索引 (放到末尾)
            const targetNotesCount = prevNotes.filter(note => note.status.name === targetStatus.name).length;

            // 创建新数组并更新目标笔记
            const updatedNotes = prevNotes.map((note, index) => {
                if (index === noteIndex) {
                     return {
                        ...note,
                        status: targetStatus,
                        index: targetNotesCount, // 放在目标列末尾
                        date: new Date(), // 更新日期
                    };
                }
                return note;
            });

            // 重新计算所有列的索引
            return reindexNotes(updatedNotes);
        });
    };

    // 拖拽开始事件处理
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        // 在 setNotes 回调完成后查找笔记，确保使用最新状态
        setNotes(prevNotes => {
            const activeNote = prevNotes.find((note) => note.id === active.id);
             if (activeNote) {
                setDraggingData({
                    active: activeNote,
                    containerId: activeNote.status.name,
                    over: null,
                });
            }
            return prevNotes; // 不修改状态
        })
    };

    // 拖拽悬停事件处理
    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        if (!over) {
            setDraggingData((prev) => ({ ...prev, over: null }));
            return;
        }
        const overId = over.id;
        setDraggingData((prev) => ({ ...prev, over: overId })); // 更新悬停目标

        // 如果悬停在列上，更新 containerId
        if (statuses.some(status => status.name === overId)) {
             setDraggingData(prev => ({...prev, containerId: overId}))
        }
         // 如果悬停在 note 上，找到 note 所属的列并更新 containerId
        else {
             // Use notes state directly here, assuming it's up-to-date enough for hover feedback
             const overNote = notes.find(note => note.id === overId);
             if(overNote) {
                 setDraggingData(prev => ({...prev, containerId: overNote.status.name}))
             }
        }
    };

    // 拖拽结束事件处理
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) { // 如果没有目标或者拖到自身，则不处理
            setDraggingData({ active: null, containerId: null, over: null });
            return;
        }
        const activeId = active.id;
        const overId = over.id;

        setNotes((prevNotes) => { // 使用函数式更新
            const activeNote = prevNotes.find((note) => note.id === activeId);
            if (!activeNote) return prevNotes;

            const activeIndex = prevNotes.findIndex((note) => note.id === activeId);
            let overIndex = prevNotes.findIndex((note) => note.id === overId);

            const newNotes = [...prevNotes]; // 创建副本
            let targetStatus: Status | undefined = undefined;
            // 判断是否拖拽到同一列
            const isSameColumn =
            prevNotes[activeIndex].status.name ===
            (overIndex !== -1
                ? prevNotes[overIndex].status.name
                : overId // 如果 over 是列名，则直接比较
            );

            if (isSameColumn) {
                // 如果拖拽到空白列区域（overId 是列名）
                if (overId === prevNotes[activeIndex].status.name) {
                    // 移动到该列的末尾
                    const currentColumnNotes = prevNotes.filter(
                        note => note.status.name === prevNotes[activeIndex].status.name
                    );
                    const lastNoteIndexInColumn = prevNotes.findIndex(
                        note => note.id === currentColumnNotes[currentColumnNotes.length - 1].id
                    );
                    overIndex = lastNoteIndexInColumn + 1;
                }

                // 使用 arrayMove 移动到目标索引
                const reorderedNotes = arrayMove(prevNotes, activeIndex, overIndex);
                return reindexNotes(reorderedNotes);
            }
            // 情况1: 拖到另一个笔记上 (overId 是 note id)
            if (overIndex !== -1) {
                const overNote = newNotes[overIndex];
                targetStatus = statuses.find(s => s.name === overNote.status.name);
            }
            // 情况2: 拖到空白列 (overId 是列名/状态名)
            else if (statuses.some((status) => status.name === overId)) {
                 targetStatus = statuses.find((s) => s.name === overId);
            }
            // 无效的放置目标
            else {
                 console.warn("Invalid drop target:", overId);
                 return prevNotes;
            }

            if (!targetStatus) {
                 console.warn("Target status not found for:", overId);
                 return prevNotes; // 无效目标状态
            }

             // 从原位置移除 activeNote
            const [movedNote] = newNotes.splice(activeIndex, 1);

            // 更新状态和日期（如果状态改变）
            const updatedMovedNote = {
                ...movedNote,
                status: targetStatus,
                date: movedNote.status.name !== targetStatus.name ? new Date() : movedNote.date, // 状态改变才更新日期
                // index 将在 reindexNotes 中更新，这里设置一个临时值或保持不变
            };

             // 找到正确的插入位置
            // 如果是拖到 note 上，插入到该 note 的位置
            // 如果是拖到列上，插入到该列的末尾
            let insertAtIndex: number;
            if (overIndex !== -1) {
                 // 找到在过滤掉 activeNote 后的 overNote 的新索引
                const tempOverIndex = newNotes.findIndex(n => n.id === overId);
                insertAtIndex = tempOverIndex;
            } else {
                 // 找到目标列的第一个元素，在其之前插入或放到数组末尾
                const firstIndexOfTargetColumn = newNotes.findIndex(n => n.status.name === targetStatus?.name);
                if(firstIndexOfTargetColumn !== -1) {
                    // 计算目标列的当前笔记数量来确定末尾位置
                    const targetNotesInColumn = newNotes.filter(n => n.status.name === targetStatus?.name);
                    // 在过滤后的 newNotes 中，找到该列最后一个元素的位置，在其后插入
                    if (targetNotesInColumn.length > 0) {
                        const lastNoteId = targetNotesInColumn[targetNotesInColumn.length - 1].id;
                        const lastNoteIndex = newNotes.findIndex(n => n.id === lastNoteId);
                        insertAtIndex = lastNoteIndex + 1;
                    } else {
                        // 如果目标列为空，直接插入到数组末尾（或者需要更精确的位置）
                         insertAtIndex = newNotes.length; // 插入到末尾
                    }

                } else {
                    insertAtIndex = newNotes.length; // 如果目标列没找到，放到末尾
                }
            }

             // 插入到计算出的位置
            newNotes.splice(insertAtIndex, 0, updatedMovedNote);


            // 统一重新计算所有索引
            return reindexNotes(newNotes);
        });

        // 清除拖拽状态
        setDraggingData({ active: null, containerId: null, over: null });
    };

    const handleDragCancel = () => {
        setDraggingData({ active: null, containerId: null, over: null });
    };

    // 处理新任务创建
    const handleCreateNewTask = (taskName: string, statusId: string) => {
        const targetStatus = statuses.find(s => s.id === statusId) || statuses[0];

        // 计算新任务在目标列的索引（放在末尾）
        const targetNotesCount = notes.filter(note => note.status.name === targetStatus.name).length;

        // 创建新任务
        const newNote: Note = {
            id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: taskName,
            status: targetStatus,
            owner: {
                id: 'user-current',
                image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=current',
                name: '当前用户'
            },
            index: targetNotesCount,
            date: new Date()
        };

        // 添加到笔记列表
        setNotes(prevNotes => {
            const updatedNotes = [...prevNotes, newNote];
            return reindexNotes(updatedNotes);
        });
    };

    // 获取主题相关的样式类
    const getThemeClasses = () => {
        // 根据当前主题返回不同的样式类
        switch (currentTheme) {
            case 'dracula':
            case 'synthwave':
                return 'bg-opacity-90 backdrop-blur-sm';
            default:
                return '';
        }
    };

    return (
        <div className={`container mx-auto py-8 ${getThemeClasses()}`} id={id}>
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h2 className="text-2xl font-bold mb-2">{title}</h2>
                    <p className="text-base-content/70">
                        {description} (Published 列仅显示最近 {maxPublishedItems} 篇)
                    </p>

                    {/* 状态切换按钮 */}
                    {showStatusButtons && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            {statuses.map(status => (
                                <button
                                    key={status.id}
                                    type="button"
                                    className={`btn btn-sm ${activeStatus === status.name ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setActiveStatus(status.name)}
                                >
                                    <div className={cn('h-2 w-2 rounded-full mr-2', STATUS_COLORS[status.name])} />
                                    {status.name}
                                </button>
                            ))}
                            {activeStatus !== 'all' && (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => setActiveStatus('all')}
                                >
                                    显示全部
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {enableNewTask && (
                    <button
                        type="button"
                        className="btn btn-primary mt-4 md:mt-0 group"
                        onClick={() => setIsNewTaskDialogOpen(true)}
                        aria-label="创建新任务"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2 transition-transform group-hover:rotate-90"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                            role="img"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        创建新任务
                    </button>
                )}
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
                modifiers={[restrictToWindowEdges]}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4">
                    {statuses
                        .filter(status => activeStatus === 'all' || status.name === activeStatus)
                        .map((status) => (
                            <ListGroup
                                key={status.id}
                                id={status.name} // Use status name as ID for SortableContext and Drop target
                                status={status}
                                notes={sortedNotesByStatus[status.name] || []}
                                onStatusChange={
                                    showStatusButtons
                                        ? handleStatusChange
                                        : undefined
                                }
                                className={cn(
                                    // Highlight the column being dragged over
                                    draggingData.containerId === status.name && draggingData.over === status.name ? 'bg-base-200/50 ring-1 ring-primary/30' : '',
                                    // Optional: slightly scale the column if dragging over it
                                    draggingData.containerId === status.name ? 'scale-[1.01]' : '',
                                    // 添加主题相关的样式
                                    'transition-all duration-300 hover:shadow-md'
                                )}
                            />
                        ))}
                </div>

                <DragOverlay>
                    {draggingData.active ? (
                        <div className="card border bg-base-100 p-3 shadow-lg opacity-95 rotate-1 border-primary min-w-[240px]">
                            <NoteContent note={draggingData.active} />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* 新任务创建对话框 */}
            <NewTaskDialog
                isOpen={isNewTaskDialogOpen}
                onClose={() => setIsNewTaskDialogOpen(false)}
                onSave={handleCreateNewTask}
                statuses={statuses}
            />
        </div>
    )
}

export default NotebookKanbanReact
