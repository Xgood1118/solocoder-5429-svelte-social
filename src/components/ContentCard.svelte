<script>
  import { createEventDispatcher } from 'svelte'
  import { images, users, tags } from '../lib/store'
  import { PLATFORMS, CONTENT_STATUS } from '../constants'

  export let content
  export let selectable = false
  export let selected = false
  export let compact = false

  const dispatch = createEventDispatcher()

  $: platform = PLATFORMS.find(p => p.id === content.platform)
  $: status = CONTENT_STATUS[content.status.toUpperCase()] || CONTENT_STATUS.DRAFT
  $: author = $users.find(u => u.id === content.authorId)
  $: coverImage = content.coverImageId ? $images.find(i => i.id === content.coverImageId) : null
  $: contentTags = content.tags?.map(tid => $tags.find(t => t.id === tid)).filter(Boolean) || []

  function handleClick(e) {
    if (selectable) {
      e.stopPropagation()
      dispatch('select', content.id)
    } else {
      dispatch('click', content)
    }
  }

  function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      id: content.id,
      isCopy: e.ctrlKey || e.metaKey
    }))
    e.dataTransfer.effectAllowed = e.ctrlKey || e.metaKey ? 'copy' : 'move'
  }
</script>

<div 
  class="content-card {compact ? 'compact' : ''}"
  style="border-left: 3px solid {status.color}"
  draggable={true}
  on:dragstart={handleDragStart}
  on:click={handleClick}
>
  {#if selectable}
    <input 
      type="checkbox" 
      class="card-checkbox"
      checked={selected}
      on:click|stopPropagation
      on:change={() => dispatch('select', content.id)}
    />
  {/if}

  {#if coverImage && !compact}
    <div class="card-cover">
      <img src={coverImage.data} alt={content.title} />
    </div>
  {/if}

  <div class="card-body">
    <div class="card-header">
      <span class="card-platform" style="color: {platform?.color}">
        {platform?.icon} {platform?.name}
      </span>
      <span class="card-time">{content.scheduledTime}</span>
    </div>

    <h4 class="card-title">{content.title || '未命名内容'}</h4>

    {#if !compact && contentTags.length > 0}
      <div class="card-tags">
        {#each contentTags.slice(0, 2) as tag}
          <span class="tag-mini" style="background: {tag.color}20; color: {tag.color}">
            {tag.name}
          </span>
        {/each}
        {#if contentTags.length > 2}
          <span class="tag-more">+{contentTags.length - 2}</span>
        {/if}
      </div>
    {/if}

    <div class="card-footer">
      <span class="card-author">{author?.avatar} {author?.name}</span>
      <span class="card-status" style="background: {status.color}20; color: {status.color}">
        {status.name}
      </span>
    </div>
  </div>
</div>

<style>
  .content-card {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    cursor: grab;
    transition: transform 0.2s, box-shadow 0.2s;
    border: 1px solid #e5e7eb;
    position: relative;
  }

  .content-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .content-card:active {
    cursor: grabbing;
  }

  .content-card.compact {
    padding: 8px 10px;
  }

  .card-checkbox {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 10;
    cursor: pointer;
  }

  .card-cover {
    width: 100%;
    height: 100px;
    overflow: hidden;
    background: #f3f4f6;
  }

  .card-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-body {
    padding: 10px 12px;
  }

  .compact .card-body {
    padding: 0;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .card-platform {
    font-size: 12px;
    font-weight: 500;
  }

  .card-time {
    font-size: 11px;
    color: #9ca3af;
  }

  .card-title {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: #111827;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .compact .card-title {
    margin-bottom: 4px;
    font-size: 12px;
    -webkit-line-clamp: 1;
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
  }

  .tag-mini {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
  }

  .tag-more {
    font-size: 11px;
    color: #9ca3af;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-author {
    font-size: 11px;
    color: #6b7280;
  }

  .card-status {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 500;
  }
</style>
