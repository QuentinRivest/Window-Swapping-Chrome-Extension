chrome.windows.onRemoved.addListener((removed_window_id) => {
  chrome.storage.sync.remove([removed_window_id.toString()]);
})
