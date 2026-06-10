<script>
  import { createEventDispatcher } from 'svelte'
  export let title = ''
  export let width = '500px'
  
  const dispatch = createEventDispatcher()

  function handleClose() {
    dispatch('close')
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }
</script>

<div class="modal-backdrop" on:click={handleBackdropClick}>
  <div class="modal" style="width: {width}">
    <div class="modal-header">
      <h3 class="modal-title">{title}</h3>
      <button class="close-btn" on:click={handleClose}>✕</button>
    </div>
    <div class="modal-body">
      <slot></slot>
    </div>
    {#if $$slots.footer}
      <div class="modal-footer">
        <slot name="footer"></slot>
      </div>
    {/if}
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: white;
    border-radius: 12px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;
    flex-shrink: 0;
  }

  .modal-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #111827;
  }

  .close-btn {
    border: none;
    background: none;
    font-size: 18px;
    cursor: pointer;
    color: #6b7280;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .close-btn:hover {
    background: #f3f4f6;
    color: #111827;
  }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .modal-footer {
    padding: 16px 20px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    flex-shrink: 0;
  }
</style>
