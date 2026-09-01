
        const { useState, useEffect, useRef, useCallback, useMemo } = React;
        const html = htm.bind(React.createElement);

        const Lucide = {
            Bold: () => '𝐁', Italic: () => '𝐼', Underline: () => 'U̲',
            Palette: () => '🎨', Highlighter: () => '🖍️', Link2: () => '🔗',
            Quote: () => '❝', Code2: () => '</>', ListOrdered: () => '1.',
            List: () => '•', Outdent: () => '⏪', Indent: () => '⏩',
            GripVertical: () => '⋮⋮', Info: () => 'ℹ️', Type: () => 'T',
            Heading1: () => 'H1', Heading2: () => 'H2', Minus: () => '—',
            Image: () => '🖼️', Video: () => '🎬', Table: () => '▦',
            MousePointerClick: () => '🖱️', LayoutDashboard: () => '📊',
            FileText: () => '📄', MessageSquare: () => '💬', FolderOpen: () => '📂',
            Tags: () => '🏷️', Users: () => '👥', TrendingUp: () => '📈',
            BarChart2: () => '📊', Download: () => '⬇️', Upload: () => '⬆️',
            Plus: () => '➕', Trash: () => '🗑️', Edit: () => '✏️'
        };

        const blockTypes = {
            paragraph: { label: '段落', icon: 'Type', defaultContent: { text: '' } },
            heading1: { label: '標題1', icon: 'Heading1', defaultContent: { text: '' } },
            heading2: { label: '標題2', icon: 'Heading2', defaultContent: { text: '' } },
            quote: { label: '引用', icon: 'Quote', defaultContent: { text: '' } },
            list: { label: '列表', icon: 'List', defaultContent: { items: [] } },
            numberedList: { label: '編號列表', icon: 'ListOrdered', defaultContent: { items: [] } },
            divider: { label: '分隔線', icon: 'Minus', defaultContent: {} },
            image: { label: '圖片', icon: 'Image', defaultContent: { src: '', alt: '' } },
            video: { label: '視頻', icon: 'Video', defaultContent: { src: '' } },
            table: { label: '表格', icon: 'Table', defaultContent: { rows: 2, cols: 2 } },
            button: { label: '按鈕', icon: 'MousePointerClick', defaultContent: { text: '按鈕', url: '#' } },
            html: { label: '自定義 HTML', icon: 'Code2', defaultContent: { code: '' } }
        };

        const generateId = () => `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const textToBlocks = (text) => {
            if (!text || text.trim() === '') return [];
            return [{ id: generateId(), type: 'paragraph', content: { text } }];
        };
        const renderIcon = (name) => {
            const fn = Lucide[name];
            return React.createElement('span', null, fn ? fn() : name);
        };

        function useBlockEditor(defaultBlocks, extraFields) {
            const [blocks, setBlocks] = useState(defaultBlocks);
            const [title, setTitle] = useState(extraFields?.title || '');
            const [coverImage, setCoverImage] = useState(extraFields?.coverImage || '');
            const [seoTitle, setSeoTitle] = useState(extraFields?.seoTitle || '');
            const [seoDesc, setSeoDesc] = useState(extraFields?.seoDesc || '');
            const [isPublished, setIsPublished] = useState(extraFields?.isPublished || false);
            const [showSlash, setShowSlash] = useState(false);
            const [slashPos, setSlashPos] = useState({ x: 0, y: 0 });
            const [slashTargetId, setSlashTargetId] = useState(null);
            const [colorPicker, setColorPicker] = useState(null);
            const [isDragging, setIsDragging] = useState(false);

            const insertBlock = (type, afterId) => {
                const newBlock = { id: generateId(), type, content: { ...blockTypes[type].defaultContent } };
                setBlocks(prev => {
                    const idx = prev.findIndex(b => b.id === afterId);
                    const arr = [...prev];
                    arr.splice(idx + 1, 0, newBlock);
                    return arr;
                });
                setShowSlash(false);
                setTimeout(() => {
                    const el = document.querySelector(`[data-block-id="${newBlock.id}"]`);
                    if (el) {
                        el.focus();
                        const range = document.createRange();
                        const sel = window.getSelection();
                        range.selectNodeContents(el);
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                }, 0);
            };

            const updateBlockContent = (id, newContent) => {
                setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: { ...b.content, ...newContent } } : b));
            };
            const deleteBlock = (id) => setBlocks(prev => prev.filter(b => b.id !== id));
            const handleDragStart = (e, id) => { e.dataTransfer.setData('text/plain', id); setIsDragging(true); };
            const handleDragOver = (e) => { e.preventDefault(); };
            const handleDrop = (e, targetId) => {
                e.preventDefault();
                const sourceId = e.dataTransfer.getData('text/plain');
                if (sourceId === targetId) return;
                setBlocks(prev => {
                    const srcIdx = prev.findIndex(b => b.id === sourceId);
                    const tgtIdx = prev.findIndex(b => b.id === targetId);
                    const arr = [...prev];
                    const [moved] = arr.splice(srcIdx, 1);
                    arr.splice(tgtIdx, 0, moved);
                    return arr;
                });
                setIsDragging(false);
            };
            const uploadImage = async (file, blockId) => {
                const fd = new FormData();
                fd.append('file', file);
                const res = await fetch('/r2-upload', { method: 'POST', body: fd });
                const data = await res.json();
                if (data.url) updateBlockContent(blockId, { src: data.url });
            };

            return {
                blocks, setBlocks, title, setTitle, coverImage, setCoverImage,
                seoTitle, setSeoTitle, seoDesc, setSeoDesc, isPublished, setIsPublished,
                showSlash, setShowSlash, slashPos, setSlashPos, slashTargetId, setSlashTargetId,
                colorPicker, setColorPicker, isDragging, setIsDragging,
                insertBlock, updateBlockContent, deleteBlock,
                handleDragStart, handleDragOver, handleDrop, uploadImage
            };
        }

        function BlockRenderer({ block, updateBlockContent, deleteBlock, uploadImage }) {
            switch (block.type) {
                case 'paragraph':
                case 'heading1':
                case 'heading2':
                case 'quote': {
                    const style = block.type === 'heading1' ? { fontSize: '2em', fontWeight: 'bold' } :
                                  block.type === 'heading2' ? { fontSize: '1.5em', fontWeight: 'bold' } :
                                  block.type === 'quote' ? { borderLeft: '3px solid #ccc', paddingLeft: '10px', fontStyle: 'italic' } : {};
                    return React.createElement('div', {
                        contentEditable: true,
                        className: 'block-content-input',
                        style,
                        onInput: (e) => updateBlockContent(block.id, { text: e.currentTarget.innerHTML }),
                        dangerouslySetInnerHTML: { __html: block.content.text || '' }
                    });
                }
                case 'list':
                case 'numberedList': {
                    const tag = block.type === 'list' ? 'ul' : 'ol';
                    return React.createElement(tag, {
                        className: 'list-disc pl-5',
                        contentEditable: true,
                        onInput: (e) => updateBlockContent(block.id, { items: Array.from(e.currentTarget.children).map(li => li.textContent) })
                    }, (block.content.items || []).map((item, i) => React.createElement('li', { key: i }, item)));
                }
                case 'divider':
                    return React.createElement('hr', { className: 'my-4' });
                case 'image':
                    return React.createElement('div', null,
                        block.content.src
                            ? React.createElement('img', { src: block.content.src, alt: block.content.alt || '', style: { maxWidth: '100%', borderRadius: '5px' } })
                            : React.createElement('div', {
                                style: { border: '2px dashed #ddd', borderRadius: '5px', padding: '20px', textAlign: 'center', cursor: 'pointer' },
                                onClick: () => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = (e) => uploadImage(e.target.files[0], block.id);
                                    input.click();
                                }
                            }, '點擊上傳圖片'),
                        React.createElement('input', {
                            type: 'text', value: block.content.alt || '', placeholder: '替代文字',
                            onChange: (e) => updateBlockContent(block.id, { alt: e.target.value }),
                            style: { width: '100%', border: '1px solid #ddd', borderRadius: '4px', padding: '4px', marginTop: '5px' }
                        }),
                        React.createElement('button', { onClick: () => deleteBlock(block.id), style: { color: 'red', fontSize: '14px', marginTop: '5px' } }, '刪除')
                    );
                case 'video':
                    return React.createElement('div', null,
                        React.createElement('input', {
                            type: 'text', value: block.content.src || '', placeholder: '視頻網址',
                            onChange: (e) => updateBlockContent(block.id, { src: e.target.value }),
                            style: { width: '100%', border: '1px solid #ddd', borderRadius: '4px', padding: '6px' }
                        }),
                        block.content.src && React.createElement('iframe', { src: block.content.src, style: { width: '100%', height: '300px', marginTop: '5px' }, allowFullScreen: true })
                    );
                case 'table':
                    return React.createElement('div', null,
                        React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '5px' } },
                            React.createElement('label', null, '行'),
                            React.createElement('input', { type: 'number', min: 1, value: block.content.rows, onChange: (e) => updateBlockContent(block.id, { rows: parseInt(e.target.value) }), style: { width: '60px', border: '1px solid #ddd' } }),
                            React.createElement('label', null, '列'),
                            React.createElement('input', { type: 'number', min: 1, value: block.content.cols, onChange: (e) => updateBlockContent(block.id, { cols: parseInt(e.target.value) }), style: { width: '60px', border: '1px solid #ddd' } })
                        ),
                        React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                            React.createElement('tbody', null,
                                Array.from({ length: block.content.rows }, (_, r) =>
                                    React.createElement('tr', { key: r },
                                        Array.from({ length: block.content.cols }, (_, c) =>
                                            React.createElement('td', { key: c, style: { border: '1px solid #ddd', padding: '5px' } },
                                                React.createElement('div', { contentEditable: true, style: { minHeight: '2em', outline: 'none' } })
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    );
                case 'button':
                    return React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                        React.createElement('input', { type: 'text', value: block.content.text, onChange: (e) => updateBlockContent(block.id, { text: e.target.value }), placeholder: '按鈕文字', style: { border: '1px solid #ddd', borderRadius: '4px', padding: '6px' } }),
                        React.createElement('input', { type: 'text', value: block.content.url, onChange: (e) => updateBlockContent(block.id, { url: e.target.value }), placeholder: '連結', style: { border: '1px solid #ddd', borderRadius: '4px', padding: '6px' } }),
                        React.createElement('button', { onClick: () => deleteBlock(block.id), style: { color: 'red' } }, '刪除')
                    );
                case 'html':
                    return React.createElement('textarea', {
                        value: block.content.code,
                        onChange: (e) => updateBlockContent(block.id, { code: e.target.value }),
                        placeholder: '輸入 HTML 代碼', rows: 5,
                        style: { width: '100%', border: '1px solid #ddd', borderRadius: '4px', padding: '6px', fontFamily: 'monospace' }
                    });
                default:
                    return null;
            }
        }

        function CategoryManager() {
            const [categories, setCategories] = useState([]);
            const [nameZh, setNameZh] = useState('');
            const [nameEn, setNameEn] = useState('');
            const [editingId, setEditingId] = useState(null);

            const loadCategories = async () => {
                const { data } = await window.supabaseClient.from('blog_categories').select('*').order('id', { ascending: true });
                setCategories(data || []);
            };
            useEffect(() => { loadCategories(); }, []);

            const handleAddOrUpdate = async () => {
                if (!nameZh.trim()) return alert('請輸入中文名稱');
                const payload = { name_zh: nameZh.trim(), name_en: nameEn.trim() };
                if (editingId) {
                    await window.supabaseClient.from('blog_categories').update(payload).eq('id', editingId);
                    setEditingId(null);
                } else {
                    await window.supabaseClient.from('blog_categories').insert(payload);
                }
                setNameZh(''); setNameEn('');
                loadCategories();
            };
            const handleEdit = (cat) => { setEditingId(cat.id); setNameZh(cat.name_zh); setNameEn(cat.name_en || ''); };
            const handleDelete = async (id) => { if (!confirm('刪除該分類？')) return; await window.supabaseClient.from('blog_categories').delete().eq('id', id); loadCategories(); };

            return React.createElement('div', null,
                React.createElement('div', { className: 'page-header' },
                    React.createElement('h3', { style: { fontSize: '20px', fontWeight: '600' } }, '文章分類管理')
                ),
                React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '20px' } },
                    React.createElement('input', { type: 'text', placeholder: '中文名稱', value: nameZh, onChange: (e) => setNameZh(e.target.value), className: 'form-input', style: { flex: 1 } }),
                    React.createElement('input', { type: 'text', placeholder: '英文名稱 (可選)', value: nameEn, onChange: (e) => setNameEn(e.target.value), className: 'form-input', style: { flex: 1 } }),
                    React.createElement('button', { className: 'btn btn-primary', onClick: handleAddOrUpdate }, editingId ? '更新' : '新增')
                ),
                React.createElement('table', { className: 'data-table' },
                    React.createElement('thead', null,
                        React.createElement('tr', null,
                            React.createElement('th', null, 'ID'),
                            React.createElement('th', null, '中文名稱'),
                            React.createElement('th', null, '英文名稱'),
                            React.createElement('th', null, '操作')
                        )
                    ),
                    React.createElement('tbody', null,
                        categories.map(cat => React.createElement('tr', { key: cat.id },
                            React.createElement('td', null, cat.id),
                            React.createElement('td', null, cat.name_zh),
                            React.createElement('td', null, cat.name_en || '-'),
                            React.createElement('td', null,
                                React.createElement('button', { className: 'btn btn-secondary btn-small', onClick: () => handleEdit(cat), style: { marginRight: '5px' } }, renderIcon('Edit'), ' 編輯'),
                                React.createElement('button', { className: 'btn btn-danger btn-small', onClick: () => handleDelete(cat.id) }, renderIcon('Trash'), ' 刪除')
                            )
                        ))
                    )
                )
            );
        }

        function TagManager() {
            const [tags, setTags] = useState([]);
            const [nameZh, setNameZh] = useState('');
            const [nameEn, setNameEn] = useState('');
            const [editingId, setEditingId] = useState(null);

            const loadTags = async () => {
                const { data } = await window.supabaseClient.from('blog_tags').select('*').order('id', { ascending: true });
                setTags(data || []);
            };
            useEffect(() => { loadTags(); }, []);

            const handleAddOrUpdate = async () => {
                if (!nameZh.trim()) return alert('請輸入中文名稱');
                const payload = { name_zh: nameZh.trim(), name_en: nameEn.trim() };
                if (editingId) {
                    await window.supabaseClient.from('blog_tags').update(payload).eq('id', editingId);
                    setEditingId(null);
                } else {
                    await window.supabaseClient.from('blog_tags').insert(payload);
                }
                setNameZh(''); setNameEn('');
                loadTags();
            };
            const handleEdit = (tag) => { setEditingId(tag.id); setNameZh(tag.name_zh); setNameEn(tag.name_en || ''); };
            const handleDelete = async (id) => { if (!confirm('刪除該標籤？')) return; await window.supabaseClient.from('blog_tags').delete().eq('id', id); loadTags(); };

            return React.createElement('div', null,
                React.createElement('div', { className: 'page-header' },
                    React.createElement('h3', { style: { fontSize: '20px', fontWeight: '600' } }, '文章標籤管理')
                ),
                React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '20px' } },
                    React.createElement('input', { type: 'text', placeholder: '中文名稱', value: nameZh, onChange: (e) => setNameZh(e.target.value), className: 'form-input', style: { flex: 1 } }),
                    React.createElement('input', { type: 'text', placeholder: '英文名稱 (可選)', value: nameEn, onChange: (e) => setNameEn(e.target.value), className: 'form-input', style: { flex: 1 } }),
                    React.createElement('button', { className: 'btn btn-primary', onClick: handleAddOrUpdate }, editingId ? '更新' : '新增')
                ),
                React.createElement('table', { className: 'data-table' },
                    React.createElement('thead', null,
                        React.createElement('tr', null,
                            React.createElement('th', null, 'ID'),
                            React.createElement('th', null, '中文名稱'),
                            React.createElement('th', null, '英文名稱'),
                            React.createElement('th', null, '操作')
                        )
                    ),
                    React.createElement('tbody', null,
                        tags.map(tag => React.createElement('tr', { key: tag.id },
                            React.createElement('td', null, tag.id),
                            React.createElement('td', null, tag.name_zh),
                            React.createElement('td', null, tag.name_en || '-'),
                            React.createElement('td', null,
                                React.createElement('button', { className: 'btn btn-secondary btn-small', onClick: () => handleEdit(tag), style: { marginRight: '5px' } }, renderIcon('Edit'), ' 編輯'),
                                React.createElement('button', { className: 'btn btn-danger btn-small', onClick: () => handleDelete(tag.id) }, renderIcon('Trash'), ' 刪除')
                            )
                        ))
                    )
                )
            );
        }

        function BlogEditor({ post, onClose }) {
            const initialBlocks = post?.content ? (() => { try { return JSON.parse(post.content); } catch { return textToBlocks(post.content); } })() : [{ id: generateId(), type: 'paragraph', content: { text: '' } }];
            const ed = useBlockEditor(initialBlocks, {
                title: post?.title || '',
                coverImage: post?.image_url || '',
                seoTitle: post?.seo_title || '',
                seoDesc: post?.seo_description || '',
                isPublished: post?.is_published || false
            });
            const { blocks, setBlocks, title, setTitle, coverImage, setCoverImage, seoTitle, setSeoTitle, seoDesc, setSeoDesc, isPublished, setIsPublished, showSlash, setShowSlash, slashPos, setSlashPos, slashTargetId, setSlashTargetId, colorPicker, setColorPicker, isDragging, setIsDragging, insertBlock, updateBlockContent, deleteBlock, handleDragStart, handleDragOver, handleDrop, uploadImage } = ed;

            const [categories, setCategories] = useState([]);
            const [tags, setTags] = useState([]);
            const [selectedCategory, setSelectedCategory] = useState(post?.category_id || '');
            const [selectedTagIds, setSelectedTagIds] = useState([]);

            useEffect(() => {
                const loadData = async () => {
                    const { data: cats } = await window.supabaseClient.from('blog_categories').select('*').order('name_zh');
                    const { data: tagsData } = await window.supabaseClient.from('blog_tags').select('*').order('name_zh');
                    setCategories(cats || []);
                    setTags(tagsData || []);
                    if (post?.id) {
                        const { data: postTags } = await window.supabaseClient.from('blog_post_tags').select('tag_id').eq('post_id', post.id);
                        setSelectedTagIds((postTags || []).map(pt => pt.tag_id));
                    }
                };
                loadData();
            }, [post]);

            useEffect(() => {
                const draft = { title, coverImage, seoTitle, seoDesc, isPublished, blocks, selectedCategory, selectedTagIds };
                localStorage.setItem('blog_draft', JSON.stringify(draft));
            }, [title, coverImage, seoTitle, seoDesc, isPublished, blocks, selectedCategory, selectedTagIds]);

            useEffect(() => {
                const handler = (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); document.execCommand('bold'); }
                    else if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); document.execCommand('italic'); }
                    else if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); document.execCommand('underline'); }
                };
                document.addEventListener('keydown', handler);
                return () => document.removeEventListener('keydown', handler);
            }, []);

            useEffect(() => {
                const handleSave = async () => {
                    const payload = {
                        title,
                        image_url: coverImage,
                        seo_title: seoTitle,
                        seo_description: seoDesc,
                        is_published: isPublished,
                        content: JSON.stringify(blocks),
                        category_id: selectedCategory || null
                    };
                    let postId = post?.id;
                    if (postId) {
                        await window.supabaseClient.from('blog_posts').update(payload).eq('id', postId);
                    } else {
                        const { data, error } = await window.supabaseClient.from('blog_posts').insert(payload).select('id').single();
                        if (data) postId = data.id;
                        else if (error) { alert('保存失敗'); return; }
                    }
                    if (postId) {
                        await window.supabaseClient.from('blog_post_tags').delete().eq('post_id', postId);
                        for (const tagId of selectedTagIds) {
                            await window.supabaseClient.from('blog_post_tags').insert({ post_id: postId, tag_id: tagId });
                        }
                    }
                    alert('已保存');
                    onClose();
                };
                const handlePreview = () => {
                    const win = window.open('', '_blank');
                    win.document.write('<html><head><title>預覽</title></head><body>');
                    win.document.write(`<h1>${title}</h1>`);
                    blocks.forEach(b => {
                        switch (b.type) {
                            case 'paragraph': win.document.write(`<p>${b.content.text}</p>`); break;
                            case 'heading1': win.document.write(`<h1>${b.content.text}</h1>`); break;
                            case 'heading2': win.document.write(`<h2>${b.content.text}</h2>`); break;
                            case 'quote': win.document.write(`<blockquote>${b.content.text}</blockquote>`); break;
                            case 'divider': win.document.write('<hr>'); break;
                            case 'image': win.document.write(`<img src="${b.content.src}" alt="${b.content.alt || ''}" style="max-width:100%;">`); break;
                            case 'video': win.document.write(`<iframe src="${b.content.src}" style="width:100%;height:400px;"></iframe>`); break;
                            case 'button': win.document.write(`<a href="${b.content.url}" style="display:inline-block;padding:10px 20px;background:#1A1A1A;color:white;border-radius:5px;">${b.content.text}</a>`); break;
                            case 'html': win.document.write(b.content.code); break;
                            case 'list': win.document.write('<ul>' + b.content.items.map(i => `<li>${i}</li>`).join('') + '</ul>'); break;
                            case 'numberedList': win.document.write('<ol>' + b.content.items.map(i => `<li>${i}</li>`).join('') + '</ol>'); break;
                        }
                    });
                    win.document.write('</body></html>');
                    win.document.close();
                };
                const handlePublish = async () => {
                    const payload = {
                        title,
                        image_url: coverImage,
                        seo_title: seoTitle,
                        seo_description: seoDesc,
                        is_published: true,
                        content: JSON.stringify(blocks),
                        category_id: selectedCategory || null
                    };
                    let postId = post?.id;
                    if (postId) {
                        await window.supabaseClient.from('blog_posts').update(payload).eq('id', postId);
                    } else {
                        const { data, error } = await window.supabaseClient.from('blog_posts').insert(payload).select('id').single();
                        if (data) postId = data.id;
                        else if (error) { alert('發佈失敗'); return; }
                    }
                    if (postId) {
                        await window.supabaseClient.from('blog_post_tags').delete().eq('post_id', postId);
                        for (const tagId of selectedTagIds) {
                            await window.supabaseClient.from('blog_post_tags').insert({ post_id: postId, tag_id: tagId });
                        }
                    }
                    alert('已發佈');
                    onClose();
                };
                window.addEventListener('save-content', handleSave);
                window.addEventListener('preview-content', handlePreview);
                window.addEventListener('publish-content', handlePublish);
                return () => {
                    window.removeEventListener('save-content', handleSave);
                    window.removeEventListener('preview-content', handlePreview);
                    window.removeEventListener('publish-content', handlePublish);
                };
            }, [blocks, title, coverImage, seoTitle, seoDesc, isPublished, selectedCategory, selectedTagIds, post, onClose]);

            const handleKeyDown = (e, blockId) => {
                if (e.key === '/') {
                    const selection = window.getSelection();
                    if (selection.rangeCount) {
                        const rect = selection.getRangeAt(0).getBoundingClientRect();
                        setSlashPos({ x: rect.left, y: rect.bottom + 5 });
                        setShowSlash(true);
                        setSlashTargetId(blockId);
                    }
                }
            };
            const toggleTag = (tagId) => {
                setSelectedTagIds(prev => prev.includes(tagId) ? prev.filter(x => x !== tagId) : [...prev, tagId]);
            };

            const toolbarButtons = [
                { onClick: () => document.execCommand('bold'), icon: 'Bold' },
                { onClick: () => document.execCommand('italic'), icon: 'Italic' },
                { onClick: () => document.execCommand('underline'), icon: 'Underline' }
            ];

            return React.createElement('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10001, display: 'flex', justifyContent: 'center', alignItems: 'center' } },
                React.createElement('div', { style: { background: 'white', borderRadius: '10px', width: '90%', maxWidth: '1000px', height: '90%', display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
                    React.createElement('div', { className: 'block-toolbar' },
                        React.createElement('select', {
                            onChange: (e) => {
                                const type = e.target.value;
                                const selectedId = window.getSelection()?.anchorNode?.parentElement?.closest('[data-block-id]')?.dataset.blockId;
                                if (selectedId) setBlocks(prev => prev.map(b => b.id === selectedId ? { ...b, type, content: { ...blockTypes[type].defaultContent, ...b.content } } : b));
                            }
                        },
                            React.createElement('option', { value: 'paragraph' }, '段落'),
                            React.createElement('option', { value: 'heading1' }, '標題1'),
                            React.createElement('option', { value: 'heading2' }, '標題2'),
                            React.createElement('option', { value: 'quote' }, '引用')
                        ),
                        React.createElement('div', { className: 'divider' }),
                        React.createElement('select', {
                            onChange: (e) => {
                                const size = e.target.value;
                                document.execCommand('fontSize', false, '7');
                                document.querySelectorAll('font[size="7"]').forEach(el => { el.removeAttribute('size'); el.style.fontSize = size + 'px'; });
                            }
                        },
                            [12, 14, 16, 18, 20, 24, 30].map(s => React.createElement('option', { key: s, value: s, selected: s === 18 }, s))
                        ),
                        React.createElement('div', { className: 'divider' }),
                        ...toolbarButtons.map(btn => React.createElement('button', { key: btn.icon, onClick: btn.onClick }, renderIcon(btn.icon))),
                        React.createElement('div', { className: 'divider' }),
                        React.createElement('button', { onClick: () => setColorPicker({ type: 'text' }) }, renderIcon('Palette')),
                        React.createElement('button', { onClick: () => setColorPicker({ type: 'background' }) }, renderIcon('Highlighter')),
                        React.createElement('div', { className: 'divider' }),
                        React.createElement('button', { onClick: () => { const url = prompt('輸入網址：'); if (url) document.execCommand('createLink', false, url); } }, renderIcon('Link2')),
                        React.createElement('button', { onClick: () => { const selectedId = window.getSelection()?.anchorNode?.parentElement?.closest('[data-block-id]')?.dataset.blockId; if (selectedId) { const block = blocks.find(b => b.id === selectedId); if (block) updateBlockContent(selectedId, { text: `<blockquote>${block.content.text}</blockquote>` }); } } }, renderIcon('Quote')),
                        React.createElement('button', { onClick: () => insertBlock('html', blocks[blocks.length - 1]?.id) }, renderIcon('Code2')),
                        React.createElement('div', { className: 'divider' }),
                        React.createElement('button', { onClick: () => document.execCommand('insertOrderedList') }, renderIcon('ListOrdered')),
                        React.createElement('button', { onClick: () => document.execCommand('insertUnorderedList') }, renderIcon('List')),
                        React.createElement('div', { className: 'divider' }),
                        React.createElement('select', { onChange: (e) => document.execCommand('justify' + e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)) },
                            React.createElement('option', { value: 'left' }, '靠左'),
                            React.createElement('option', { value: 'center' }, '置中'),
                            React.createElement('option', { value: 'right' }, '靠右'),
                            React.createElement('option', { value: 'full' }, '左右對齊')
                        ),
                        React.createElement('button', { onClick: () => document.execCommand('outdent') }, renderIcon('Outdent')),
                        React.createElement('button', { onClick: () => document.execCommand('indent') }, renderIcon('Indent')),
                        React.createElement('div', { className: 'divider' }),
                        React.createElement('button', { onClick: () => setIsDragging(!isDragging) }, renderIcon('GripVertical')),
                        React.createElement('button', { onClick: () => alert('快捷鍵：Ctrl+B 粗體，Ctrl+I 斜體，Ctrl+U 底線') }, renderIcon('Info'))
                    ),
                    React.createElement('div', { style: { flex: 1, overflowY: 'auto', background: '#FAF8F5', padding: '20px' } },
                        React.createElement('div', { className: 'editor-content', onKeyDown: (e) => { const blockId = e.target.closest('[data-block-id]')?.dataset.blockId; if (blockId) handleKeyDown(e, blockId); } },
                            React.createElement('input', { type: 'text', value: title, onChange: (e) => setTitle(e.target.value), placeholder: '文章標題', style: { width: '100%', fontSize: '2em', fontWeight: 'bold', border: 'none', outline: 'none', background: 'transparent', marginBottom: '20px' } }),
                            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' } },
                                React.createElement('label', { style: { cursor: 'pointer' } },
                                    React.createElement('span', { style: { display: 'block', fontSize: '14px', color: '#666' } }, '封面圖片'),
                                    React.createElement('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: async (e) => { const file = e.target.files[0]; if (file) { const fd = new FormData(); fd.append('file', file); const res = await fetch('/r2-upload', { method: 'POST', body: fd }); const data = await res.json(); setCoverImage(data.url); } } }),
                                    coverImage
                                        ? React.createElement('img', { src: coverImage, style: { width: '100px', height: '60px', objectFit: 'cover', borderRadius: '5px' } })
                                        : React.createElement('div', { style: { width: '100px', height: '60px', border: '2px dashed #ddd', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' } }, '上傳')
                                ),
                                React.createElement('div', null,
                                    React.createElement('label', { style: { fontSize: '14px', color: '#666' } }, 'SEO 標題'),
                                    React.createElement('input', { type: 'text', value: seoTitle, onChange: (e) => setSeoTitle(e.target.value), style: { width: '100%', border: '1px solid #ddd', borderRadius: '4px', padding: '6px' } })
                                ),
                                React.createElement('div', null,
                                    React.createElement('label', { style: { fontSize: '14px', color: '#666' } }, 'SEO 描述'),
                                    React.createElement('input', { type: 'text', value: seoDesc, onChange: (e) => setSeoDesc(e.target.value), style: { width: '100%', border: '1px solid #ddd', borderRadius: '4px', padding: '6px' } })
                                )
                            ),
                            React.createElement('div', { style: { display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' } },
                                React.createElement('div', { style: { flex: '1 1 200px' } },
                                    React.createElement('label', { style: { fontSize: '14px', color: '#666', display: 'block' } }, '分類'),
                                    React.createElement('select', {
                                        value: selectedCategory,
                                        onChange: (e) => setSelectedCategory(e.target.value),
                                        style: { width: '100%', border: '1px solid #ddd', borderRadius: '4px', padding: '6px' }
                                    },
                                        React.createElement('option', { value: '' }, '無分類'),
                                        categories.map(cat => React.createElement('option', { key: cat.id, value: cat.id }, cat.name_zh))
                                    )
                                ),
                                React.createElement('div', { style: { flex: '1 1 300px' } },
                                    React.createElement('label', { style: { fontSize: '14px', color: '#666', display: 'block' } }, '標籤'),
                                    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '5px' } },
                                        tags.map(tag => React.createElement('label', { key: tag.id, style: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', border: '1px solid #ddd', borderRadius: '15px', cursor: 'pointer', background: selectedTagIds.includes(tag.id) ? '#1A1A1A' : 'transparent', color: selectedTagIds.includes(tag.id) ? 'white' : 'inherit' } },
                                            React.createElement('input', { type: 'checkbox', checked: selectedTagIds.includes(tag.id), onChange: () => toggleTag(tag.id), style: { display: 'none' } }),
                                            tag.name_zh
                                        ))
                                    )
                                )
                            ),
                            ...blocks.map(block => React.createElement('div', {
                                key: block.id,
                                'data-block-id': block.id,
                                className: `block-item ${isDragging ? 'dragging' : ''}`,
                                draggable: isDragging,
                                onDragStart: (e) => handleDragStart(e, block.id),
                                onDragOver: handleDragOver,
                                onDrop: (e) => handleDrop(e, block.id),
                                onDragEnd: () => setIsDragging(false)
                            },
                                React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start' } },
                                    isDragging && React.createElement('span', { className: 'block-drag-handle' }, renderIcon('GripVertical')),
                                    React.createElement('div', { style: { flex: 1 } },
                                        React.createElement(BlockRenderer, { block, updateBlockContent, deleteBlock, uploadImage })
                                    )
                                )
                            ))
                        )
                    ),
                    React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', padding: '10px', borderTop: '1px solid #eee' } },
                        React.createElement('button', { className: 'btn btn-primary', onClick: () => window.dispatchEvent(new CustomEvent('save-content')) }, '保存'),
                        React.createElement('button', { className: 'btn btn-secondary', onClick: onClose, style: { marginLeft: '8px' } }, '關閉')
                    )
                ),
                showSlash && React.createElement('div', { className: 'slash-menu', style: { left: slashPos.x, top: slashPos.y } },
                    Object.entries(blockTypes).map(([type, def]) =>
                        React.createElement('div', { key: type, className: 'slash-menu-item', onClick: () => insertBlock(type, slashTargetId) },
                            renderIcon(def.icon),
                            React.createElement('span', null, def.label)
                        )
                    )
                ),
                colorPicker && React.createElement('div', { className: 'color-picker-popover', style: { left: '200px', top: '120px' } },
                    React.createElement('input', {
                        type: 'color',
                        onChange: (e) => {
                            const color = e.target.value;
                            if (colorPicker.type === 'text') document.execCommand('foreColor', false, color);
                            else document.execCommand('hiliteColor', false, color);
                            setColorPicker(null);
                        }
                    })
                )
            );
        }

        function FaqEditor() {
            const [faqs, setFaqs] = useState([]);
            const [question, setQuestion] = useState('');
            const [answer, setAnswer] = useState('');
            const [editingId, setEditingId] = useState(null);

            const loadFaqs = async () => {
                const { data } = await window.supabaseClient.from('faq_items').select('*').order('sort_order', { ascending: true });
                setFaqs(data || []);
            };
            useEffect(() => { loadFaqs(); }, []);

            const handleSubmit = async () => {
                if (!question.trim() || !answer.trim()) return alert('請填寫問題與答案');
                const payload = { question: question.trim(), answer: answer.trim() };
                if (editingId) {
                    await window.supabaseClient.from('faq_items').update(payload).eq('id', editingId);
                    setEditingId(null);
                } else {
                    await window.supabaseClient.from('faq_items').insert(payload);
                }
                setQuestion(''); setAnswer('');
                loadFaqs();
            };
            const handleEdit = (faq) => { setEditingId(faq.id); setQuestion(faq.question); setAnswer(faq.answer); };
            const handleDelete = async (id) => { if (!confirm('確定刪除？')) return; await window.supabaseClient.from('faq_items').delete().eq('id', id); loadFaqs(); };
            const togglePublish = async (id, current) => { await window.supabaseClient.from('faq_items').update({ is_published: !current }).eq('id', id); loadFaqs(); };

            return React.createElement('div', null,
                React.createElement('div', { className: 'page-header' },
                    React.createElement('h3', { style: { fontSize: '20px', fontWeight: '600' } }, '常見問題管理')
                ),
                React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '20px' } },
                    React.createElement('input', { type: 'text', placeholder: '問題', value: question, onChange: (e) => setQuestion(e.target.value), className: 'form-input', style: { flex: 1 } }),
                    React.createElement('textarea', { placeholder: '答案', value: answer, onChange: (e) => setAnswer(e.target.value), className: 'form-textarea', style: { flex: 1, minHeight: '60px' } }),
                    React.createElement('button', { className: 'btn btn-primary', onClick: handleSubmit }, editingId ? '更新' : '新增')
                ),
                React.createElement('table', { className: 'data-table' },
                    React.createElement('thead', null,
                        React.createElement('tr', null,
                            React.createElement('th', null, '問題'),
                            React.createElement('th', null, '答案'),
                            React.createElement('th', null, '狀態'),
                            React.createElement('th', null, '操作')
                        )
                    ),
                    React.createElement('tbody', null,
                        faqs.map(faq => React.createElement('tr', { key: faq.id },
                            React.createElement('td', null, faq.question),
                            React.createElement('td', null, faq.answer),
                            React.createElement('td', null, faq.is_published ? '已發佈' : '草稿'),
                            React.createElement('td', null,
                                React.createElement('button', { className: 'btn btn-secondary btn-small', onClick: () => handleEdit(faq), style: { marginRight: '5px' } }, '編輯'),
                                React.createElement('button', { className: 'btn btn-secondary btn-small', onClick: () => togglePublish(faq.id, faq.is_published), style: { marginRight: '5px' } }, faq.is_published ? '取消發佈' : '發佈'),
                                React.createElement('button', { className: 'btn btn-danger btn-small', onClick: () => handleDelete(faq.id) }, '刪除')
                            )
                        ))
                    )
                )
            );
        }

        function ContactEditor() {
            const [shopLogo, setShopLogo] = useState('');
            const [shopPhone, setShopPhone] = useState('');
            const [shopEmail, setShopEmail] = useState('');
            const [shopAddress, setShopAddress] = useState('');
            const [mapUrl, setMapUrl] = useState('');
            const [isPublished, setIsPublished] = useState(false);

            useEffect(() => {
                const loadData = async () => {
                    const { data } = await window.supabaseClient.from('contact_settings').select('*').limit(1).maybeSingle();
                    if (data) {
                        setShopLogo(data.shop_logo || '');
                        setShopPhone(data.shop_phone || '');
                        setShopEmail(data.shop_email || '');
                        setShopAddress(data.shop_address || '');
                        setMapUrl(data.map_url || '');
                        setIsPublished(data.is_published || false);
                    }
                };
                loadData();
            }, []);

            const handleSave = async () => {
                const payload = {
                    shop_logo: shopLogo,
                    shop_phone: shopPhone,
                    shop_email: shopEmail,
                    shop_address: shopAddress,
                    map_url: mapUrl,
                    is_published: isPublished
                };
                const { data: existing } = await window.supabaseClient.from('contact_settings').select('id').limit(1);
                if (existing && existing.length > 0) {
                    await window.supabaseClient.from('contact_settings').update(payload).eq('id', existing[0].id);
                } else {
                    await window.supabaseClient.from('contact_settings').insert(payload);
                }
                alert('已保存');
            };

            return React.createElement('div', null,
                React.createElement('div', { className: 'page-header' },
                    React.createElement('h3', { style: { fontSize: '20px', fontWeight: '600' } }, '聯絡我們設定')
                ),
                React.createElement('div', { className: 'form-container', style: { maxWidth: '600px' } },
                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', { className: 'form-label' }, '店鋪 Logo URL'),
                        React.createElement('input', { type: 'text', className: 'form-input', value: shopLogo, onChange: (e) => setShopLogo(e.target.value), placeholder: '圖片網址' })
                    ),
                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', { className: 'form-label' }, '電話'),
                        React.createElement('input', { type: 'text', className: 'form-input', value: shopPhone, onChange: (e) => setShopPhone(e.target.value) })
                    ),
                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', { className: 'form-label' }, 'Email'),
                        React.createElement('input', { type: 'email', className: 'form-input', value: shopEmail, onChange: (e) => setShopEmail(e.target.value) })
                    ),
                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', { className: 'form-label' }, '地址'),
                        React.createElement('textarea', { className: 'form-textarea', value: shopAddress, onChange: (e) => setShopAddress(e.target.value) })
                    ),
                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', { className: 'form-label' }, 'Google Maps 嵌入網址'),
                        React.createElement('input', { type: 'text', className: 'form-input', value: mapUrl, onChange: (e) => setMapUrl(e.target.value) })
                    ),
                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                            React.createElement('input', { type: 'checkbox', checked: isPublished, onChange: (e) => setIsPublished(e.target.checked) }),
                            '發佈'
                        )
                    ),
                    React.createElement('button', { className: 'btn btn-primary', onClick: handleSave }, '保存')
                )
            );
        }

        function ContentEditor() {
            const [activeSection, setActiveSection] = useState('articles');
            const [editingPost, setEditingPost] = useState(undefined);
            const [posts, setPosts] = useState([]);
            const [loading, setLoading] = useState(false);
            const [selectedPostIds, setSelectedPostIds] = useState([]);

            const loadPosts = async () => {
                setLoading(true);
                try {
                    const { data, error } = await window.supabaseClient.from('blog_posts').select('*').order('created_at', { ascending: false });
                    if (error) throw error;
                    setPosts(data || []);
                    setSelectedPostIds([]);
                } catch (e) {
                    console.error('載入文章失敗', e);
                    setPosts([]);
                } finally {
                    setLoading(false);
                }
            };

            useEffect(() => {
                if (activeSection === 'articles') loadPosts();
            }, [activeSection]);

            const handleSelectAll = (e) => {
                if (e.target.checked) { setSelectedPostIds(posts.map(p => p.id)); } else { setSelectedPostIds([]); }
            };
            const toggleSelect = (id) => {
                setSelectedPostIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
            };
            const togglePublish = async (postId, currentStatus) => {
                await window.supabaseClient.from('blog_posts').update({ is_published: !currentStatus }).eq('id', postId);
                loadPosts();
            };

            const exportCSV = () => {
                const selectedPosts = posts.filter(p => selectedPostIds.includes(p.id));
                if (selectedPosts.length === 0) { alert('請先勾選要匯出的文章'); return; }
                const headers = ['id', 'title', 'content', 'image_url', 'seo_title', 'seo_description', 'is_published', 'created_at', 'category_id'];
                const csvRows = [headers.join(',')];
                selectedPosts.forEach(post => {
                    const row = [
                        post.id,
                        csvEscape(post.title || ''),
                        csvEscape(post.content || ''),
                        csvEscape(post.image_url || ''),
                        csvEscape(post.seo_title || ''),
                        csvEscape(post.seo_description || ''),
                        post.is_published ? 'true' : 'false',
                        csvEscape(post.created_at || ''),
                        post.category_id || ''
                    ];
                    csvRows.push(row.join(','));
                });
                const csvString = csvRows.join('\n');
                const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'blog_posts_export.csv';
                a.click();
                URL.revokeObjectURL(url);
            };

            const importCSV = (file) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const text = e.target.result;
                    const rows = parseCSV(text);
                    if (rows.length < 2) { alert('CSV 格式不正確'); return; }
                    const headers = rows[0].map(h => h.trim());
                    const requiredFields = ['title', 'content'];
                    if (!requiredFields.every(f => headers.includes(f))) { alert('CSV 缺少必要欄位：title, content'); return; }
                    let successCount = 0;
                    for (let i = 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (row.length === 0) continue;
                        const obj = {};
                        headers.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? row[idx] : ''; });
                        obj.is_published = obj.is_published === 'true' || obj.is_published === 'TRUE' || obj.is_published === '1';
                        const id = obj.id ? parseInt(obj.id) : null;
                        delete obj.id;
                        obj.category_id = obj.category_id ? parseInt(obj.category_id) : null;
                        try {
                            if (id) {
                                const { error } = await window.supabaseClient.from('blog_posts').update(obj).eq('id', id);
                                if (!error) successCount++;
                            } else {
                                const { error } = await window.supabaseClient.from('blog_posts').insert(obj);
                                if (!error) successCount++;
                            }
                        } catch (err) { console.error('匯入失敗', err); }
                    }
                    alert(`匯入完成，成功 ${successCount} 筆`);
                    loadPosts();
                };
                reader.readAsText(file);
            };

            const csvEscape = (str) => {
                if (str == null) return '';
                str = String(str);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    str = '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            };
            const parseCSV = (text) => {
                const rows = [];
                let row = [];
                let field = '';
                let inQuotes = false;
                for (let i = 0; i < text.length; i++) {
                    const c = text[i];
                    if (inQuotes) {
                        if (c === '"') {
                            if (text[i+1] === '"') { field += '"'; i++; } else { inQuotes = false; }
                        } else { field += c; }
                    } else {
                        if (c === '"') { inQuotes = true; }
                        else if (c === ',') { row.push(field); field = ''; }
                        else if (c === '\n' || c === '\r') {
                            if (c === '\r' && text[i+1] === '\n') i++;
                            row.push(field);
                            rows.push(row);
                            row = [];
                            field = '';
                        } else { field += c; }
                    }
                }
                if (field || row.length) { row.push(field); rows.push(row); }
                return rows;
            };

            const sidebarItems = [
                { key: 'overview', label: '總覽', icon: 'LayoutDashboard' },
                { key: 'articles', label: '文章', icon: 'FileText' },
                { key: 'comments', label: '留言', icon: 'MessageSquare' },
                { key: 'categories', label: '類別', icon: 'FolderOpen' },
                { key: 'tags', label: '標籤', icon: 'Tags' },
                { key: 'authors', label: '作家', icon: 'Users' },
                { key: 'monetization', label: '創造營收', icon: 'TrendingUp' },
                { key: 'analytics', label: '分析', icon: 'BarChart2' }
            ];

            return React.createElement('div', { className: 'block-editor-wrapper' },
                React.createElement('div', { className: 'editor-sidebar' },
                    sidebarItems.map(item =>
                        React.createElement('div', {
                            key: item.key,
                            className: `editor-sidebar-item ${activeSection === item.key ? 'active' : ''}`,
                            onClick: () => setActiveSection(item.key)
                        },
                            renderIcon(item.icon),
                            React.createElement('span', null, item.label)
                        )
                    )
                ),
                React.createElement('div', { className: 'editor-main' },
                    React.createElement('div', { className: 'editor-topbar' },
                        React.createElement('div', { className: 'editor-topbar-left' },
                            React.createElement('button', { className: 'btn btn-secondary btn-small', onClick: () => window.history.back() }, '上一步'),
                            React.createElement('h3', { style: { fontSize: '18px', fontWeight: '600' } },
                                activeSection === 'articles' ? '文章管理' :
                                activeSection === 'faq' ? '常見問題管理' :
                                activeSection === 'contact' ? '聯絡我們設定' :
                                activeSection === 'categories' ? '文章分類管理' :
                                activeSection === 'tags' ? '文章標籤管理' :
                                activeSection === 'comments' ? '留言管理' :
                                '總覽'
                            )
                        ),
                        React.createElement('div', { className: 'editor-topbar-right' },
                            React.createElement('button', { className: 'btn btn-secondary btn-small', onClick: () => window.dispatchEvent(new CustomEvent('save-content')) }, '儲存'),
                            React.createElement('button', { className: 'btn btn-secondary btn-small', onClick: () => window.dispatchEvent(new CustomEvent('preview-content')) }, '預覽'),
                            React.createElement('button', { className: 'btn btn-primary btn-small', onClick: () => window.dispatchEvent(new CustomEvent('publish-content')) }, '發佈')
                        )
                    ),
                    React.createElement('div', { className: 'editor-canvas' },
                        activeSection === 'articles' && React.createElement('div', null,
                            React.createElement('div', { className: 'page-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' } },
                                React.createElement('h3', { style: { fontSize: '20px', fontWeight: '600' } }, '所有文章'),
                                React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                                    React.createElement('button', { className: 'btn btn-secondary btn-small', onClick: exportCSV }, renderIcon('Download'), ' 匯出選中 CSV'),
                                    React.createElement('label', { className: 'btn btn-secondary btn-small', style: { cursor: 'pointer' } },
                                        renderIcon('Upload'), ' 匯入 CSV',
                                        React.createElement('input', { type: 'file', accept: '.csv', style: { display: 'none' }, onChange: (e) => { if (e.target.files[0]) importCSV(e.target.files[0]); } })
                                    ),
                                    React.createElement('button', { className: 'btn btn-primary', onClick: () => setEditingPost(null) }, '新增文章')
                                )
                            ),
                            loading
                                ? React.createElement('div', { className: 'empty-state' }, '載入中...')
                                : posts.length === 0
                                    ? React.createElement('div', { className: 'empty-state' }, '暫無文章')
                                    : React.createElement('table', { className: 'data-table' },
                                        React.createElement('thead', null,
                                            React.createElement('tr', null,
                                                React.createElement('th', { style: { width: '30px' } },
                                                    React.createElement('input', { type: 'checkbox', onChange: handleSelectAll, checked: posts.length > 0 && selectedPostIds.length === posts.length })
                                                ),
                                                React.createElement('th', null, '標題'),
                                                React.createElement('th', null, '狀態'),
                                                React.createElement('th', null, '日期'),
                                                React.createElement('th', null, '操作')
                                            )
                                        ),
                                        React.createElement('tbody', null,
                                            posts.map(post =>
                                                React.createElement('tr', { key: post.id },
                                                    React.createElement('td', null,
                                                        React.createElement('input', { type: 'checkbox', checked: selectedPostIds.includes(post.id), onChange: () => toggleSelect(post.id) })
                                                    ),
                                                    React.createElement('td', null, React.createElement('b', null, post.title)),
                                                    React.createElement('td', null, post.is_published ? '已發佈' : '草稿'),
                                                    React.createElement('td', null, post.created_at ? post.created_at.slice(0, 10) : '-'),
                                                    React.createElement('td', null,
                                                        React.createElement('button', { className: 'btn btn-secondary btn-small', onClick: () => setEditingPost(post) }, '編輯'),
                                                        React.createElement('button', {
                                                            className: 'btn btn-small ' + (post.is_published ? 'btn-danger' : 'btn-primary'),
                                                            style: { marginLeft: '5px' },
                                                            onClick: () => togglePublish(post.id, post.is_published)
                                                        }, post.is_published ? '取消發佈' : '發佈')
                                                    )
                                                )
                                            )
                                        )
                                    )
                        ),
                        activeSection === 'categories' && React.createElement(CategoryManager),
                        activeSection === 'tags' && React.createElement(TagManager),
                        activeSection === 'faq' && React.createElement(FaqEditor),
                        activeSection === 'contact' && React.createElement(ContactEditor),
                        activeSection === 'comments' && React.createElement('div', { className: 'empty-state' }, '留言管理開發中'),
                        !['articles', 'categories', 'tags', 'faq', 'contact', 'comments'].includes(activeSection) && React.createElement('div', { className: 'empty-state' }, '此功能開發中')
                    )
                ),
                editingPost !== undefined && activeSection === 'articles' && React.createElement(BlogEditor, { post: editingPost, onClose: () => { setEditingPost(undefined); loadPosts(); } })
            );
        }

        window.mountContentEditor = function(container) {
            container.innerHTML = '';
            const root = ReactDOM.createRoot(container);
            root.render(React.createElement(ContentEditor));
        };
    