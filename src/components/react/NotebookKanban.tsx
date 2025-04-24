import React, { useState, useMemo, useEffect } from 'react'
import { cn } from '../../lib/utils'
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
    restrictToVerticalAxis,
    restrictToWindowEdges,
} from '@dnd-kit/modifiers'

// 颜色映射
const STATUS_COLORS: Record<string, string> = {
    Draft: 'bg-blue-400',
    'In Review': 'bg-yellow-400',
    Published: 'bg-green-400',
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

// 组件props类型
export interface NotebookKanbanProps {
    showStatusButtons?: boolean
    maxPublishedItems?: number
}

const LOCAL_STORAGE_KEY = 'notebookKanbanNotes'

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
                                { id: '1', name: 'Draft', color: 'draft' },
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
}) => (
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
        <div className="badge badge-sm">{count}</div>
    </div>
)

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
                >
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </button>
        )
    }

    return null
}

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
            window.open(note.url, '_blank');
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

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                'card border bg-base-100 p-3 shadow-sm transition-all duration-200 group',
                'cursor-grab hover:shadow-md hover:scale-[1.02] active:scale-[1.02]',
                isDragging ? 'opacity-50 rotate-1 border-primary' : '',
                note.status.name === 'Published' ? 'cursor-pointer' : ''
            )}
            onClick={handleNoteClick}
        >
            <div className="relative">
  <NoteContent note={note} />
  {note.status.name === 'Published' && (
    <a
      href={note.url}
      className="absolute -right-2 -top-2 bg-primary/90 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
      target="_blank"
      rel="noopener noreferrer"
    >
    </a>
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
        </div>
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

const NotebookKanbanReact: React.FC<NotebookKanbanProps> = ({
    showStatusButtons = true,
    maxPublishedItems = 10,
}) => {
    // 定义状态类型
    const statuses: Status[] = [
        { id: '1', name: 'Draft', color: 'draft' },
        { id: '2', name: 'In Review', color: 'in-review' },
        { id: '3', name: 'Published', color: 'published' },
    ]

    // 使用固定日期避免水合不匹配
    const getFixedDate = () => new Date(2025, 3, 14)

    // Default initial data (used if localStorage is empty or invalid)
    const defaultNotes: Note[] = [
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
            url: '/blog/how-to-build-a-successful-blog'
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
        {
            id: 'note-6',
            name: 'The Art of Storytelling',
            status: statuses[2],
            owner: { id: 'user-1', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=6', name: 'Alex Johnson' },
            index: 1, date: getFixedDate(),
            url: '/blog/the-art-of-storytelling'
        },
        {
            id: 'note-7',
            name: 'Video Marketing Trends',
            status: statuses[2],
            owner: { id: 'user-2', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=7', name: 'Sam Smith' },
            index: 2, date: getFixedDate(),
            url: '/blog/video-marketing-trends',
        },
        {
            id: 'note-8',
            name: 'Social Media Strategy',
            status: statuses[2],
            owner: { id: 'user-3', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=8', name: 'Taylor Brown' },
            index: 3, date: getFixedDate(),
            url: '/blog/social-media-strategy'
        },
        {
            id: 'note-9',
            name: 'Email Newsletter Best Practices',
            status: statuses[2],
            owner: { id: 'user-4', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=9', name: 'Jordan Lee' },
            index: 4, date: getFixedDate(),
            url: '/blog/email-newsletter-best-practices'
        },
        {
            id: 'note-10',
            name: 'Mobile-First Content Strategy',
            status: statuses[2],
            owner: { id: 'user-5', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=10', name: 'Casey Morgan' },
            index: 5, date: getFixedDate(),
            url: '/blog/mobile-first-content-strategy'
        },
        {
            id: 'note-11',
            name: 'Data-Driven Content Creation',
            status: statuses[2],
            owner: { id: 'user-1', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=11', name: 'Alex Johnson' },
            index: 6, date: getFixedDate(),
            url: '/blog/data-driven-content-creation'
        },
        {
            id: 'note-12',
            name: 'Personal Branding Through Content',
            status: statuses[2],
            owner: { id: 'user-2', image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=12', name: 'Sam Smith' },
            index: 7, date: getFixedDate(),
            url: '/blog/personal-branding-through-content'
        },
    ]

    // 笔记数据状态 - 从 localStorage 初始化
    const [notes, setNotes] = useState<Note[]>(() => {
        // Ensure this code runs only on the client-side
        if (typeof window === 'undefined') {
            return defaultNotes;
        }
        try {
            const storedNotes = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedNotes) {
                // 解析并验证数据结构 (简化验证)
                const parsedNotes = JSON.parse(storedNotes);
                if (Array.isArray(parsedNotes) && parsedNotes.length > 0 && parsedNotes[0].id) {
                     // 将存储的日期字符串转换回 Date 对象
                     return parsedNotes.map((note: any) => ({ // Use any temporarily for parsing robustness
                        ...note,
                        status: statuses.find(s => s.name === note.status?.name) || statuses[0], // Ensure status object integrity
                        owner: note.owner || { id: 'unknown', image: '', name: 'Unknown' }, // Ensure owner exists
                        date: note.date ? new Date(note.date) : undefined,
                        index: typeof note.index === 'number' ? note.index : 0 // Ensure index is number
                    }));
                }
            }
        } catch (error) {
            console.error("Error reading notes from localStorage:", error);
        }
        // 如果 localStorage 无效或为空，返回默认数据
        return defaultNotes;
    });

    // 使用 useEffect 将状态同步到 localStorage
    useEffect(() => {
        // Ensure this code runs only on the client-side
        if (typeof window === 'undefined') {
            return;
        }
        try {
            // 存储时将 Date 对象转换为 ISO 字符串
            const notesToStore = notes.map(note => ({
                ...note,
                date: note.date?.toISOString(),
            }));
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notesToStore));
        } catch (error) {
            console.error("Error saving notes to localStorage:", error);
        }
    }, [notes]); // 当 notes 状态改变时触发

    // 拖拽状态
    const [draggingData, setDraggingData] = useState<DraggingData>({
        active: null,
        containerId: null,
        over: null,
    })

    // 分类笔记并按索引排序
    const sortedNotesByStatus = useMemo(() => {
        const result: Record<string, Note[]> = {}

        statuses.forEach((status) => {
            let statusNotes = notes
                .filter((note: Note) => note.status.name === status.name)
                .sort((a: Note, b: Note) => a.index - b.index)

            // 对于Published状态，按索引排序，但限制为最近的10篇
            if (status.name === 'Published') {
                // 保持拖拽的排序，但限制数量
                statusNotes = statusNotes.slice(0, maxPublishedItems)
            }

            result[status.name] = statusNotes
        })

        return result
    }, [notes, statuses, maxPublishedItems])

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
        statuses.forEach(status => { statusGroups[status.name] = [] });

        // 分组并按现有 index 排序
        notesToIndex.forEach(note => {
            if (statusGroups[note.status.name]) {
                statusGroups[note.status.name].push(note);
            }
        });

       
        // 为每个分组重新计算索引
        const reindexedNotes: Note[] = [];
    Object.keys(statusGroups).forEach((statusName) => {
        // 直接按传入的顺序分配索引，不排序
        const groupNotes = statusGroups[statusName]; 
        groupNotes.forEach((note, newIndex) => {
            reindexedNotes.push({
                ...note,
                index: newIndex, // 重新分配连续索引
            });
        });
    });

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
        const { active, over } = event;
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

            let newNotes = [...prevNotes]; // 创建副本
            let targetStatus: Status | undefined = undefined;
            let targetIndex: number | undefined = undefined;
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
                const newNotes = arrayMove(prevNotes, activeIndex, overIndex);
                return reindexNotes(newNotes);
            }
            // 情况1: 拖到另一个笔记上 (overId 是 note id)
            else if (overIndex !== -1) {
                const overNote = newNotes[overIndex];
                targetStatus = statuses.find(s => s.name === overNote.status.name);
                targetIndex = overNote.index; // 目标索引是 overNote 的索引
            }
            // 情况2: 拖到空白列 (overId 是列名/状态名)
            else if (statuses.some((status) => status.name === overId)) {
                 targetStatus = statuses.find((s) => s.name === overId);
                 // 目标索引是该列的末尾
                 targetIndex = newNotes.filter(note => note.status.name === overId).length;
            } else {
                 // 无效的放置目标
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

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">笔记看板</h2>
                <p className="text-base-content/70">
                    在不同阶段管理您的博客文章 (Published 列仅显示最近 {maxPublishedItems} 篇)
                </p>
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
                    {statuses.map((status) => (
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
                                draggingData.containerId === status.name ? 'scale-[1.01]' : ''
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
        </div>
    )
}

export default NotebookKanbanReact
