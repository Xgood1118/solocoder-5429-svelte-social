<script>
  import { onMount } from 'svelte'
  import { contents, analytics, fans, images } from '../lib/store'
  import { PLATFORMS, CONTENT_STATUS } from '../constants'
  import { parseMetricsText, formatDate, getWeekDates } from '../lib/utils'
  import { saveAnalytics, getAnalyticsByContent } from '../lib/contentService'
  import { addFansData } from '../lib/dataService'
  import Modal from '../components/Modal.svelte'

  let activeTab = 'overview'
  let selectedPlatform = 'all'
  let showAnalyticsModal = false
  let selectedContent = null
  let metricsText = ''
  let analyticsPlatform = PLATFORMS[0].id
  let showHeatmapDetail = false
  let heatmapDetailData = []
  let heatmapDetailHour = null

  let fansDate = formatDate(new Date())
  let fansPlatform = PLATFORMS[0].id
  let totalFans = ''
  let newFans = ''

  const tabs = [
    { id: 'overview', name: '数据概览' },
    { id: 'fans', name: '粉丝增长' },
    { id: 'heatmap', name: '最佳发布时间' },
    { id: 'input', name: '数据录入' }
  ]

  $: publishedContents = $contents.filter(c => c.status === 'published')

  $: totalMetrics = {
    views: $analytics.reduce((sum, a) => sum + (a.views || 0), 0),
    likes: $analytics.reduce((sum, a) => sum + (a.likes || 0), 0),
    comments: $analytics.reduce((sum, a) => sum + (a.comments || 0), 0),
    shares: $analytics.reduce((sum, a) => sum + (a.shares || 0), 0),
    favorites: $analytics.reduce((sum, a) => sum + (a.favorites || 0), 0)
  }

  $: platformMetrics = PLATFORMS.map(p => {
    const platformAnalytics = $analytics.filter(a => a.platform === p.id)
    return {
      platform: p,
      views: platformAnalytics.reduce((sum, a) => sum + (a.views || 0), 0),
      likes: platformAnalytics.reduce((sum, a) => sum + (a.likes || 0), 0),
      comments: platformAnalytics.reduce((sum, a) => sum + (a.comments || 0), 0),
      shares: platformAnalytics.reduce((sum, a) => sum + (a.shares || 0), 0),
      favorites: platformAnalytics.reduce((sum, a) => sum + (a.favorites || 0), 0),
      count: platformAnalytics.length
    }
  })

  $: fansByPlatform = PLATFORMS.map(p => {
    const platformFans = $fans.filter(f => f.platform === p.id).sort((a, b) => a.date.localeCompare(b.date))
    return {
      platform: p,
      data: platformFans,
      latest: platformFans.length > 0 ? platformFans[platformFans.length - 1] : null
    }
  })

  $: heatmapData = (() => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    
    const data = [0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
      return hours.map(hour => {
        const relevantContents = $contents.filter(c => {
          if (c.status !== 'published') return false
          if (selectedPlatform !== 'all' && c.platform !== selectedPlatform) return false
          
          const contentHour = parseInt(c.scheduledTime?.split(':')[0]) || 9
          if (contentHour !== hour) return false
          
          const contentDate = new Date(c.date)
          const contentDay = contentDate.getDay()
          const adjustedDay = contentDay === 0 ? 6 : contentDay - 1
          if (adjustedDay !== dayIndex) return false
          
          return true
        })
        
        const totalViews = relevantContents.reduce((sum, c) => {
          const analytic = $analytics.find(a => a.contentId === c.id)
          return sum + (analytic?.views || 0)
        }, 0)
        
        const avgViews = relevantContents.length > 0 ? totalViews / relevantContents.length : 0
        
        return {
          hour,
          day: dayIndex,
          avgViews,
          count: relevantContents.length,
          contents: relevantContents
        }
      })
    })
    
    return data
  })()

  function getHeatmapColor(avgViews) {
    const maxViews = Math.max(...heatmapData.flat().map(d => d.avgViews), 1)
    const ratio = avgViews / maxViews
    if (ratio === 0) return '#f3f4f6'
    if (ratio < 0.2) return '#dbeafe'
    if (ratio < 0.4) return '#93c5fd'
    if (ratio < 0.6) return '#60a5fa'
    if (ratio < 0.8) return '#3b82f6'
    return '#1d4ed8'
  }

  function handleHeatmapCellClick(cell) {
    if (cell.contents.length > 0) {
      heatmapDetailData = cell.contents
      heatmapDetailHour = `${cell.hour}:00 - 周${['一', '二', '三', '四', '五', '六', '日'][cell.day]}`
      showHeatmapDetail = true
    }
  }

  function openAnalyticsInput(content) {
    selectedContent = content
    analyticsPlatform = content.platform
    metricsText = ''
    showAnalyticsModal = true
  }

  function handleParseMetrics() {
    const metrics = parseMetricsText(metricsText)
    console.log('解析结果:', metrics)
    alert(`解析到：阅读 ${metrics.views || 0}, 点赞 ${metrics.likes || 0}, 评论 ${metrics.comments || 0}, 转发 ${metrics.shares || 0}, 收藏 ${metrics.favorites || 0}`)
  }

  async function handleSaveAnalytics() {
    const metrics = parseMetricsText(metricsText)
    if (selectedContent) {
      await saveAnalytics(selectedContent.id, analyticsPlatform, metrics)
      showAnalyticsModal = false
      selectedContent = null
      metricsText = ''
    }
  }

  async function handleAddFans() {
    if (!totalFans) {
      alert('请输入总粉丝数')
      return
    }
    await addFansData(fansPlatform, fansDate, totalFans, newFans || 0)
    totalFans = ''
    newFans = ''
  }

  function formatNumber(num) {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k'
    }
    return num.toString()
  }

  function getMaxFans(data) {
    if (!data || data.length === 0) return 100
    return Math.max(...data.map(d => d.totalFans)) * 1.1
  }
</script>

<div class="analytics-view">
  <div class="view-header">
    <h2 class="view-title">数据分析</h2>
    
    <div class="tabs">
      {#each tabs as tab}
        <button 
          class="tab-btn {activeTab === tab.id ? 'active' : ''}"
          on:click={() => activeTab = tab.id}
        >
          {tab.name}
        </button>
      {/each}
    </div>
  </div>

  {#if activeTab === 'overview'}
    <div class="overview-section">
      <div class="metrics-cards">
        <div class="metric-card">
          <div class="metric-value">{formatNumber(totalMetrics.views)}</div>
          <div class="metric-label">总阅读量</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{formatNumber(totalMetrics.likes)}</div>
          <div class="metric-label">总点赞数</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{formatNumber(totalMetrics.comments)}</div>
          <div class="metric-label">总评论数</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{formatNumber(totalMetrics.shares)}</div>
          <div class="metric-label">总转发数</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{formatNumber(totalMetrics.favorites)}</div>
          <div class="metric-label">总收藏数</div>
        </div>
      </div>

      <div class="platform-breakdown">
        <h3 class="section-title">各平台数据</h3>
        <div class="platform-list">
          {#each platformMetrics as pm}
            <div class="platform-item">
              <div class="platform-header">
                <span class="platform-name" style="color: {pm.platform.color}">
                  {pm.platform.icon} {pm.platform.name}
                </span>
                <span class="platform-count">{pm.count} 篇内容</span>
              </div>
              <div class="platform-metrics">
                <div class="platform-metric">
                  <span class="pm-label">阅读</span>
                  <span class="pm-value">{formatNumber(pm.views)}</span>
                </div>
                <div class="platform-metric">
                  <span class="pm-label">点赞</span>
                  <span class="pm-value">{formatNumber(pm.likes)}</span>
                </div>
                <div class="platform-metric">
                  <span class="pm-label">评论</span>
                  <span class="pm-value">{formatNumber(pm.comments)}</span>
                </div>
                <div class="platform-metric">
                  <span class="pm-label">转发</span>
                  <span class="pm-value">{formatNumber(pm.shares)}</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="content-list-section">
        <h3 class="section-title">已发布内容</h3>
        <div class="published-list">
          {#if publishedContents.length > 0}
            {#each publishedContents as content}
              <div class="published-item">
                <div class="pub-info">
                  <span class="pub-platform" style="color: {PLATFORMS.find(p => p.id === content.platform)?.color}">
                    {PLATFORMS.find(p => p.id === content.platform)?.icon}
                  </span>
                  <div class="pub-text">
                    <div class="pub-title">{content.title}</div>
                    <div class="pub-date">{content.date} {content.scheduledTime}</div>
                  </div>
                </div>
                <button class="btn btn-outline btn-sm" on:click={() => openAnalyticsInput(content)}>
                  录入数据
                </button>
              </div>
            {/each}
          {:else}
            <p class="empty-text">暂无已发布内容</p>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if activeTab === 'fans'}
    <div class="fans-section">
      <div class="fans-input-card">
        <h3 class="section-title">录入粉丝数据</h3>
        <div class="fans-form">
          <div class="form-group">
            <label>日期</label>
            <input type="date" bind:value={fansDate} />
          </div>
          <div class="form-group">
            <label>平台</label>
            <select bind:value={fansPlatform}>
              {#each PLATFORMS as p}
                <option value={p.id}>{p.icon} {p.name}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label>总粉丝数</label>
            <input type="number" bind:value={totalFans} placeholder="请输入总粉丝数" />
          </div>
          <div class="form-group">
            <label>新增粉丝</label>
            <input type="number" bind:value={newFans} placeholder="新增粉丝数（可选）" />
          </div>
          <button class="btn btn-primary" on:click={handleAddFans}>保存</button>
        </div>
      </div>

      <div class="fans-charts">
        <h3 class="section-title">粉丝增长趋势</h3>
        {#each fansByPlatform as fb}
          <div class="fans-chart-card">
            <div class="chart-header">
              <span class="chart-platform" style="color: {fb.platform.color}">
                {fb.platform.icon} {fb.platform.name}
              </span>
              {#if fb.latest}
                <span class="chart-latest">
                  当前: {formatNumber(fb.latest.totalFans)} 粉丝
                </span>
              {/if}
            </div>
            
            {#if fb.data.length > 0}
              <div class="chart-container">
                <svg viewBox="0 0 400 120" class="chart-svg">
                  {#each fb.data as point, i}
                    {#each [point] as p}
                      <circle 
                        cx={(i / (fb.data.length - 1 || 1)) * 380 + 10} 
                        cy={110 - (p.totalFans / getMaxFans(fb.data)) * 100} 
                        r="3" 
                        fill={fb.platform.color} 
                      />
                      {#if i > 0}
                        <line 
                          x1={((i - 1) / (fb.data.length - 1 || 1)) * 380 + 10}
                          y1={110 - (fb.data[i - 1].totalFans / getMaxFans(fb.data)) * 100}
                          x2={(i / (fb.data.length - 1 || 1)) * 380 + 10}
                          y2={110 - (p.totalFans / getMaxFans(fb.data)) * 100}
                          stroke={fb.platform.color} 
                          stroke-width="2" 
                        />
                      {/if}
                    {/each}
                  {/each}
                </svg>
                <div class="chart-labels">
                  {#each fb.data.slice(0, 1) as d}
                    <span>{d.date.slice(5)}</span>
                  {/each}
                  <span style="flex: 1"></span>
                  {#each fb.data.slice(-1) as d}
                    <span>{d.date.slice(5)}</span>
                  {/each}
                </div>
              </div>
            {:else}
              <p class="empty-text-small">暂无数据</p>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if activeTab === 'heatmap'}
    <div class="heatmap-section">
      <div class="heatmap-controls">
        <label>平台筛选:</label>
        <select bind:value={selectedPlatform}>
          <option value="all">全部平台</option>
          {#each PLATFORMS as p}
            <option value={p.id}>{p.icon} {p.name}</option>
          {/each}
        </select>
        <span class="heatmap-tip">💡 点击格子可查看该时段发布的内容</span>
      </div>

      <div class="heatmap-container">
        <div class="heatmap-grid">
          <div class="heatmap-corner"></div>
          {#each Array.from({length: 24}, (_, i) => i) as hour}
            <div class="heatmap-hour">{hour}:00</div>
          {/each}
          
          {#each ['一', '二', '三', '四', '五', '六', '日'] as day, dayIndex}
            <div class="heatmap-day-label">周{day}</div>
            {#each heatmapData[dayIndex] as cell}
              <div 
                class="heatmap-cell"
                style="background: {getHeatmapColor(cell.avgViews)}"
                title="平均阅读: {Math.round(cell.avgViews)} / 共{cell.count}篇"
                on:click={() => handleHeatmapCellClick(cell)}
              >
                {#if cell.count > 0}
                  <span class="cell-count">{cell.count}</span>
                {/if}
              </div>
            {/each}
          {/each}
        </div>
        
        <div class="heatmap-legend">
          <span>低</span>
          <div class="legend-gradient"></div>
          <span>高</span>
          <span class="legend-label">（平均阅读量）</span>
        </div>
      </div>
    </div>
  {/if}

  {#if activeTab === 'input'}
    <div class="input-section">
      <div class="input-card">
        <h3 class="section-title">快速录入互动数据</h3>
        <p class="input-tip">
          💡 支持从 Excel 或 App 复制粘贴，系统自动识别字段。例如：<br />
          <code>阅读数 1024, 点赞 56, 评论 12, 转发 3, 收藏 8</code>
        </p>
        
        <div class="input-form">
          <div class="form-group">
            <label>选择平台</label>
            <select bind:value={analyticsPlatform}>
              {#each PLATFORMS as p}
                <option value={p.id}>{p.icon} {p.name}</option>
              {/each}
            </select>
          </div>
          
          <div class="form-group full">
            <label>粘贴数据</label>
            <textarea 
              bind:value={metricsText}
              placeholder="将平台数据粘贴到这里..."
              rows="4"
            ></textarea>
          </div>
          
          <div class="input-actions">
            <button class="btn btn-outline" on:click={handleParseMetrics}>预览解析结果</button>
            <button class="btn btn-primary" on:click={handleSaveAnalytics} disabled={!selectedContent}>
              保存到内容
            </button>
          </div>
        </div>
        
        <div class="content-select">
          <h4>选择要关联的内容</h4>
          <div class="content-options">
            {#if publishedContents.length > 0}
              {#each publishedContents as content}
                <button 
                  class="content-option {selectedContent?.id === content.id ? 'selected' : ''}"
                  on:click={() => selectedContent = content}
                >
                  <span class="co-platform" style="color: {PLATFORMS.find(p => p.id === content.platform)?.color}">
                    {PLATFORMS.find(p => p.id === content.platform)?.icon}
                  </span>
                  <span class="co-title">{content.title}</span>
                  <span class="co-date">{content.date}</span>
                </button>
              {/each}
            {:else}
              <p class="empty-text">暂无已发布内容</p>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

{#if showAnalyticsModal && selectedContent}
  <Modal title="录入互动数据" width="400px" on:close={() => showAnalyticsModal = false}>
    <div class="analytics-form">
      <p class="modal-desc">
        为「{selectedContent.title}」录入 
        {PLATFORMS.find(p => p.id === analyticsPlatform)?.name} 数据
      </p>
      
      <div class="form-group">
        <label>粘贴数据</label>
        <textarea 
          bind:value={metricsText}
          placeholder="如：阅读数 1024, 点赞 56, 评论 12, 转发 3, 收藏 8"
          rows="3"
        ></textarea>
      </div>
      
      <p class="parse-tip">支持格式：阅读、点赞、评论、转发、收藏 等关键词</p>
    </div>
    <span slot="footer">
      <button class="btn btn-secondary" on:click={() => showAnalyticsModal = false}>取消</button>
      <button class="btn btn-primary" on:click={handleSaveAnalytics}>保存</button>
    </span>
  </Modal>
{/if}

{#if showHeatmapDetail}
  <Modal title={`${heatmapDetailHour} 发布的内容`} width="500px" on:close={() => showHeatmapDetail = false}>
    <div class="heatmap-detail">
      {#if heatmapDetailData.length > 0}
        {#each heatmapDetailData as content}
          <div class="detail-item">
            <span class="di-platform" style="color: {PLATFORMS.find(p => p.id === content.platform)?.color}">
              {PLATFORMS.find(p => p.id === content.platform)?.icon}
            </span>
            <div class="di-info">
              <div class="di-title">{content.title}</div>
              <div class="di-date">{content.date}</div>
            </div>
            {#if $analytics.find(a => a.contentId === content.id)}
              <span class="di-views">
                {formatNumber($analytics.find(a => a.contentId === content.id).views)} 阅读
              </span>
            {/if}
          </div>
        {/each}
      {:else}
        <p class="empty-text">暂无内容</p>
      {/if}
    </div>
  </Modal>
{/if}

<style>
  .analytics-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .view-header {
    background: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .view-title {
    margin: 0 0 14px;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }

  .tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 0;
  }

  .tab-btn {
    padding: 10px 18px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 14px;
    color: #6b7280;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }

  .tab-btn.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
    font-weight: 500;
  }

  .section-title {
    margin: 0 0 16px;
    font-size: 15px;
    font-weight: 600;
    color: #111827;
  }

  .metrics-cards {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }

  .metric-card {
    background: white;
    padding: 16px;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    text-align: center;
  }

  .metric-value {
    font-size: 24px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 4px;
  }

  .metric-label {
    font-size: 13px;
    color: #6b7280;
  }

  .platform-breakdown,
  .content-list-section,
  .fans-input-card,
  .fans-charts,
  .input-card {
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    margin-bottom: 16px;
  }

  .platform-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .platform-item {
    padding: 12px;
    background: #f9fafb;
    border-radius: 8px;
  }

  .platform-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .platform-name {
    font-weight: 600;
    font-size: 14px;
  }

  .platform-count {
    font-size: 12px;
    color: #9ca3af;
  }

  .platform-metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .platform-metric {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .pm-label {
    font-size: 11px;
    color: #9ca3af;
  }

  .pm-value {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .published-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .published-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f9fafb;
    border-radius: 8px;
  }

  .pub-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .pub-platform {
    font-size: 20px;
  }

  .pub-title {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
  }

  .pub-date {
    font-size: 12px;
    color: #9ca3af;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 12px;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-outline {
    background: white;
    border: 1px solid #d1d5db;
    color: #4b5563;
  }

  .btn-outline:hover {
    background: #f9fafb;
  }

  .btn-secondary {
    background: #e5e7eb;
    color: #374151;
  }

  .btn-secondary:hover {
    background: #d1d5db;
  }

  .empty-text {
    text-align: center;
    color: #9ca3af;
    padding: 20px;
  }

  .empty-text-small {
    text-align: center;
    color: #d1d5db;
    padding: 16px;
    font-size: 13px;
  }

  .fans-form {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr auto;
    gap: 12px;
    align-items: end;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group.full {
    grid-column: 1 / -1;
  }

  .form-group label {
    font-size: 13px;
    font-weight: 500;
    color: #4b5563;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .fans-chart-card {
    background: #f9fafb;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .chart-platform {
    font-weight: 600;
    font-size: 14px;
  }

  .chart-latest {
    font-size: 12px;
    color: #6b7280;
  }

  .chart-container {
    width: 100%;
  }

  .chart-svg {
    width: 100%;
    height: 120px;
  }

  .chart-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #9ca3af;
    margin-top: 4px;
  }

  .heatmap-section {
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .heatmap-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    font-size: 13px;
    color: #4b5563;
  }

  .heatmap-controls select {
    padding: 6px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
  }

  .heatmap-tip {
    margin-left: auto;
    font-size: 12px;
    color: #9ca3af;
  }

  .heatmap-container {
    overflow-x: auto;
  }

  .heatmap-grid {
    display: grid;
    grid-template-columns: 50px repeat(24, minmax(36px, 1fr));
    gap: 2px;
  }

  .heatmap-corner {
    height: 28px;
  }

  .heatmap-hour {
    font-size: 10px;
    color: #9ca3af;
    text-align: center;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .heatmap-day-label {
    font-size: 12px;
    color: #6b7280;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px;
  }

  .heatmap-cell {
    height: 36px;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .heatmap-cell:hover {
    transform: scale(1.1);
    z-index: 1;
  }

  .cell-count {
    font-size: 10px;
    color: white;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  }

  .heatmap-legend {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    justify-content: center;
    font-size: 12px;
    color: #6b7280;
  }

  .legend-gradient {
    width: 120px;
    height: 12px;
    background: linear-gradient(to right, #f3f4f6, #dbeafe, #93c5fd, #3b82f6, #1d4ed8);
    border-radius: 4px;
  }

  .legend-label {
    margin-left: 4px;
  }

  .input-tip {
    font-size: 13px;
    color: #6b7280;
    line-height: 1.6;
    margin: 0 0 16px;
  }

  .input-tip code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
  }

  .input-form {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }

  .input-actions {
    grid-column: 1 / -1;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .content-select h4 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .content-options {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 300px;
    overflow-y: auto;
  }

  .content-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
  }

  .content-option:hover {
    border-color: #d1d5db;
    background: #f9fafb;
  }

  .content-option.selected {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .co-platform {
    font-size: 18px;
  }

  .co-title {
    flex: 1;
    font-size: 13px;
    color: #111827;
  }

  .co-date {
    font-size: 12px;
    color: #9ca3af;
  }

  .parse-tip {
    font-size: 12px;
    color: #9ca3af;
    margin: 8px 0 0;
  }

  .modal-desc {
    font-size: 14px;
    color: #6b7280;
    margin: 0 0 16px;
  }

  .analytics-form .form-group {
    margin-bottom: 12px;
  }

  .heatmap-detail {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: #f9fafb;
    border-radius: 8px;
  }

  .di-platform {
    font-size: 20px;
  }

  .di-info {
    flex: 1;
  }

  .di-title {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
  }

  .di-date {
    font-size: 12px;
    color: #9ca3af;
  }

  .di-views {
    font-size: 13px;
    color: #3b82f6;
    font-weight: 500;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
