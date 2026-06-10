<script>
  import { onMount } from 'svelte'
  import { comments, contents, settings, currentUser } from '../lib/store'
  import { PLATFORMS } from '../constants'
  import { addComment, replyToComment, deleteComment } from '../lib/dataService'
  import Modal from '../components/Modal.svelte'

  let filterPlatform = 'all'
  let filterStatus = 'all'
  let groupBy = 'content'
  let showReplyModal = false
  let replyingComment = null
  let replyContent = ''
  let showAddModal = false
  let newComment = {
    contentId: '',
    platform: PLATFORMS[0].id,
    userName: '',
    content: ''
  }

  $: filteredComments = $comments.filter(c => {
    if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false
    if (filterStatus === 'unreplied' && c.isReplied) return false
    if (filterStatus === 'replied' && !c.isReplied) return false
    return true
  })

  $: groupedByContent = (() => {
    const groups = {}
    filteredComments.forEach(c => {
      const key = c.contentId || 'unknown'
      if (!groups[key]) {
        const content = $contents.find(con => con.id === c.contentId)
        groups[key] = {
          contentId: key,
          title: content?.title || '未知内容',
          platform: content?.platform,
          comments: []
        }
      }
      groups[key].comments.push(c)
    })
    return Object.values(groups).sort((a, b) => b.comments.length - a.comments.length)
  })()

  $: stats = {
    total: $comments.length,
    unreplied: $comments.filter(c => !c.isReplied).length
  }

  function getReplyIdentity(platform) {
    const identities = $settings.replyIdentities
    if (identities && identities[platform]) {
      const config = identities[platform]
      if (config.prefix) {
        return `${config.prefix}回复`
      }
      return config.type === 'official' ? '官方回复' : '个人回复'
    }
    return '官方回复'
  }

  function openReply(comment) {
    replyingComment = comment
    replyContent = ''
    showReplyModal = true
  }

  async function handleReply() {
    if (!replyContent.trim()) {
      alert('请输入回复内容')
      return
    }
    
    const identity = getReplyIdentity(replyingComment.platform)
    await replyToComment(replyingComment.id, replyContent, identity)
    showReplyModal = false
    replyingComment = null
    replyContent = ''
  }

  function openAddComment() {
    newComment = {
      contentId: $contents.length > 0 ? $contents[0].id : '',
      platform: PLATFORMS[0].id,
      userName: '',
      content: ''
    }
    showAddModal = true
  }

  async function handleAddComment() {
    if (!newComment.content.trim()) {
      alert('请输入评论内容')
      return
    }
    
    await addComment(newComment.contentId, newComment.platform, {
      userName: newComment.userName || '匿名用户',
      content: newComment.content
    })
    
    showAddModal = false
  }

  async function handleDelete(id) {
    if (confirm('确定要删除这条评论吗？')) {
      await deleteComment(id)
    }
  }

  function getContentTitle(contentId) {
    const content = $contents.find(c => c.id === contentId)
    return content?.title || '未关联内容'
  }

  function formatTime(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
</script>

<div class="comments-view">
  <div class="view-header">
    <div class="header-top">
      <h2 class="view-title">评论管理</h2>
      <button class="btn btn-primary" on:click={openAddComment}>
        + 添加评论
      </button>
    </div>

    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{stats.total}</span>
        <span class="stat-label">总评论数</span>
      </div>
      <div class="stat-item highlight">
        <span class="stat-value">{stats.unreplied}</span>
        <span class="stat-label">待回复</span>
      </div>
    </div>

    <div class="filters">
      <select bind:value={filterPlatform}>
        <option value="all">全部平台</option>
        {#each PLATFORMS as p}
          <option value={p.id}>{p.icon} {p.name}</option>
        {/each}
      </select>

      <select bind:value={filterStatus}>
        <option value="all">全部状态</option>
        <option value="unreplied">待回复</option>
        <option value="replied">已回复</option>
      </select>

      <div class="group-toggle">
        <span class="group-label">分组方式:</span>
        <button 
          class="group-btn {groupBy === 'content' ? 'active' : ''}"
          on:click={() => groupBy = 'content'}
        >
          按内容
        </button>
        <button 
          class="group-btn {groupBy === 'list' ? 'active' : ''}"
          on:click={() => groupBy = 'list'}
        >
          列表
        </button>
      </div>
    </div>
  </div>

  {#if groupBy === 'content'}
    <div class="comments-grouped">
      {#if groupedByContent.length > 0}
        {#each groupedByContent as group}
          <div class="comment-group">
            <div class="group-header">
              <div class="group-title">
                {#if group.platform}
                  <span class="group-platform" style="color: {PLATFORMS.find(p => p.id === group.platform)?.color}">
                    {PLATFORMS.find(p => p.id === group.platform)?.icon}
                  </span>
                {/if}
                <span class="group-name">{group.title}</span>
              </div>
              <span class="group-count">{group.comments.length} 条评论</span>
            </div>
            
            <div class="group-comments">
              {#each group.comments as comment}
                <div class="comment-item {!comment.isReplied ? 'unreplied' : ''}">
                  <div class="comment-header">
                    <span class="comment-avatar">{comment.userAvatar}</span>
                    <span class="comment-name">{comment.userName}</span>
                    <span class="comment-platform" style="color: {PLATFORMS.find(p => p.id === comment.platform)?.color}">
                      {PLATFORMS.find(p => p.id === comment.platform)?.icon}
                    </span>
                    <span class="comment-time">{formatTime(comment.createdAt)}</span>
                    {#if !comment.isReplied}
                      <span class="unreplied-badge">待回复</span>
                    {/if}
                  </div>
                  <div class="comment-content">{comment.content}</div>
                  
                  {#if comment.isReplied}
                    <div class="comment-reply">
                      <div class="reply-label">
                        <span class="reply-badge">{comment.replyIdentity || '回复'}</span>
                      </div>
                      <div class="reply-content">{comment.replyContent}</div>
                      <div class="reply-time">{formatTime(comment.repliedAt)}</div>
                    </div>
                  {/if}
                  
                  <div class="comment-actions">
                    {#if !comment.isReplied}
                      <button class="action-btn reply" on:click={() => openReply(comment)}>回复</button>
                    {/if}
                    <button class="action-btn delete" on:click={() => handleDelete(comment.id)}>删除</button>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      {:else}
        <div class="empty-state">
          <p class="empty-icon">💬</p>
          <p>暂无评论</p>
          <p class="empty-desc">点击「添加评论」手动录入评论数据</p>
        </div>
      {/if}
    </div>
  {:else}
    <div class="comments-list">
      {#if filteredComments.length > 0}
        {#each filteredComments as comment}
          <div class="comment-item {!comment.isReplied ? 'unreplied' : ''}">
            <div class="comment-header">
              <span class="comment-avatar">{comment.userAvatar}</span>
              <span class="comment-name">{comment.userName}</span>
              <span class="comment-platform" style="color: {PLATFORMS.find(p => p.id === comment.platform)?.color}">
                {PLATFORMS.find(p => p.id === comment.platform)?.icon}
              </span>
              <span class="comment-content-title">《{getContentTitle(comment.contentId)}》</span>
              <span class="comment-time">{formatTime(comment.createdAt)}</span>
              {#if !comment.isReplied}
                <span class="unreplied-badge">待回复</span>
              {/if}
            </div>
            <div class="comment-content-text">{comment.content}</div>
            
            {#if comment.isReplied}
              <div class="comment-reply">
                <span class="reply-badge">{comment.replyIdentity || '回复'}</span>
                <span class="reply-text">{comment.replyContent}</span>
              </div>
            {/if}
            
            <div class="comment-actions">
              {#if !comment.isReplied}
                <button class="action-btn reply" on:click={() => openReply(comment)}>回复</button>
              {/if}
              <button class="action-btn delete" on:click={() => handleDelete(comment.id)}>删除</button>
            </div>
          </div>
        {/each}
      {:else}
        <div class="empty-state">
          <p class="empty-icon">💬</p>
          <p>暂无评论</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

{#if showReplyModal && replyingComment}
  <Modal title="回复评论" width="400px" on:close={() => showReplyModal = false}>
    <div class="reply-form">
      <div class="reply-preview">
        <p class="preview-label">原评论:</p>
        <p class="preview-content">{replyingComment.content}</p>
        <p class="preview-info">
          <span style="color: {PLATFORMS.find(p => p.id === replyingComment.platform)?.color}">
            {PLATFORMS.find(p => p.id === replyingComment.platform)?.icon} 
            {PLATFORMS.find(p => p.id === replyingComment.platform)?.name}
          </span>
          · {replyingComment.userName}
        </p>
      </div>
      
      <div class="form-group">
        <label>回复身份</label>
        <div class="identity-preview">
          <span class="identity-badge">{getReplyIdentity(replyingComment.platform)}</span>
          <span class="identity-tip">可在系统设置中配置各平台回复身份</span>
        </div>
      </div>
      
      <div class="form-group">
        <label>回复内容</label>
        <textarea 
          bind:value={replyContent}
          placeholder="请输入回复内容..."
          rows="4"
        ></textarea>
      </div>
    </div>
    <span slot="footer">
      <button class="btn btn-secondary" on:click={() => showReplyModal = false}>取消</button>
      <button class="btn btn-primary" on:click={handleReply}>发送回复</button>
    </span>
  </Modal>
{/if}

{#if showAddModal}
  <Modal title="添加评论" width="400px" on:close={() => showAddModal = false}>
    <div class="add-form">
      <div class="form-group">
        <label>关联内容</label>
        <select bind:value={newComment.contentId}>
          {#each $contents as c}
            <option value={c.id}>{c.title || '未命名'}</option>
          {/each}
        </select>
      </div>
      
      <div class="form-group">
        <label>平台</label>
        <select bind:value={newComment.platform}>
          {#each PLATFORMS as p}
            <option value={p.id}>{p.icon} {p.name}</option>
          {/each}
        </select>
      </div>
      
      <div class="form-group">
        <label>评论用户</label>
        <input type="text" bind:value={newComment.userName} placeholder="用户名（留空为匿名）" />
      </div>
      
      <div class="form-group">
        <label>评论内容</label>
        <textarea 
          bind:value={newComment.content}
          placeholder="请输入评论内容..."
          rows="4"
        ></textarea>
      </div>
    </div>
    <span slot="footer">
      <button class="btn btn-secondary" on:click={() => showAddModal = false}>取消</button>
      <button class="btn btn-primary" on:click={handleAddComment}>添加</button>
    </span>
  </Modal>
{/if}

<style>
  .comments-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .view-header {
    background: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .view-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }

  .btn {
    padding: 10px 18px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-secondary {
    background: #e5e7eb;
    color: #374151;
  }

  .btn-secondary:hover {
    background: #d1d5db;
  }

  .stats-bar {
    display: flex;
    gap: 20px;
    padding: 12px 16px;
    background: #f9fafb;
    border-radius: 8px;
  }

  .stat-item {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
  }

  .stat-item.highlight .stat-value {
    color: #ef4444;
  }

  .stat-label {
    font-size: 13px;
    color: #6b7280;
  }

  .filters {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .filters select {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
  }

  .group-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  .group-label {
    font-size: 13px;
    color: #6b7280;
  }

  .group-btn {
    padding: 6px 12px;
    border: 1px solid #e5e7eb;
    background: white;
    cursor: pointer;
    font-size: 12px;
    color: #6b7280;
    border-radius: 6px;
  }

  .group-btn.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .comments-grouped {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .comment-group {
    background: white;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    background: #f9fafb;
    border-bottom: 1px solid #f3f4f6;
  }

  .group-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .group-platform {
    font-size: 18px;
  }

  .group-name {
    font-weight: 600;
    font-size: 14px;
    color: #111827;
  }

  .group-count {
    font-size: 12px;
    color: #9ca3af;
  }

  .group-comments {
    padding: 12px 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .comments-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .comment-item {
    padding: 14px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    border-left: 3px solid #e5e7eb;
  }

  .comment-item.unreplied {
    border-left-color: #ef4444;
  }

  .comment-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .comment-avatar {
    font-size: 24px;
  }

  .comment-name {
    font-weight: 600;
    font-size: 14px;
    color: #111827;
  }

  .comment-platform {
    font-size: 14px;
  }

  .comment-content-title {
    font-size: 12px;
    color: #6b7280;
  }

  .comment-time {
    font-size: 12px;
    color: #9ca3af;
    margin-left: auto;
  }

  .unreplied-badge {
    padding: 2px 8px;
    background: #fef2f2;
    color: #ef4444;
    font-size: 11px;
    border-radius: 10px;
    font-weight: 500;
  }

  .comment-content,
  .comment-content-text {
    font-size: 14px;
    color: #374151;
    line-height: 1.6;
    margin-bottom: 10px;
  }

  .comment-reply {
    padding: 10px 14px;
    background: #f0fdf4;
    border-radius: 6px;
    margin-bottom: 10px;
  }

  .reply-label {
    margin-bottom: 4px;
  }

  .reply-badge {
    display: inline-block;
    padding: 2px 8px;
    background: #dcfce7;
    color: #16a34a;
    font-size: 11px;
    border-radius: 10px;
    font-weight: 500;
  }

  .reply-content,
  .reply-text {
    font-size: 13px;
    color: #374151;
    line-height: 1.5;
  }

  .reply-time {
    font-size: 11px;
    color: #9ca3af;
    margin-top: 4px;
  }

  .comment-actions {
    display: flex;
    gap: 8px;
  }

  .action-btn {
    padding: 6px 12px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 12px;
    border-radius: 6px;
    transition: background 0.2s;
  }

  .action-btn.reply {
    background: #eff6ff;
    color: #3b82f6;
  }

  .action-btn.reply:hover {
    background: #dbeafe;
  }

  .action-btn.delete {
    color: #ef4444;
  }

  .action-btn.delete:hover {
    background: #fef2f2;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #9ca3af;
    background: white;
    border-radius: 10px;
  }

  .empty-icon {
    font-size: 48px;
    margin: 0 0 12px;
  }

  .empty-state p {
    margin: 4px 0;
  }

  .empty-desc {
    font-size: 13px;
    color: #d1d5db;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;
  }

  .form-group label {
    font-size: 13px;
    font-weight: 500;
    color: #4b5563;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .reply-preview,
  .identity-preview {
    padding: 12px;
    background: #f9fafb;
    border-radius: 8px;
    margin-bottom: 14px;
  }

  .preview-label {
    font-size: 12px;
    color: #9ca3af;
    margin: 0 0 6px;
  }

  .preview-content {
    font-size: 14px;
    color: #374151;
    margin: 0 0 8px;
  }

  .preview-info {
    font-size: 12px;
    color: #6b7280;
    margin: 0;
  }

  .identity-preview {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .identity-tip {
    font-size: 12px;
    color: #9ca3af;
  }
</style>
