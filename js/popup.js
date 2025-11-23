/*
* - If a saved window is open along with a bunch of not-saved windows, there
*   needs to be a way to differentiate it from the non-saved windows, as the
*   behavior is rather different.
* - If the window being saved/swapped exists, then it that window's data needs
*   to be updated, but between the time it was loaded and when it's saved
*   again, it could've completely changed (could have no tabs in common).
*   - Maybe there's a unique identifier that a window has for differentiating
*     when multiple Chrome windows are open.
*   - Then, of course, if the window is not a saved window, then the extension
*     would have to create a new window in storage.
*/
import * as Helpers from "./popup-helpers.js"



/*** HTML ELEMENTS ***/

// Elements for saving the current window.
const save_current_window_btn = document.getElementById("saveCurrentWindowBtn");
const input_text_modal        = document.getElementById("inputTextModal");

// Elements for opening a saved window.
const open_saved_window_btn         = document.getElementById("openSavedWindowBtn");

// Elements for swapping the current window with a saved window.
const swap_with_btn = document.getElementById("swapWithBtn");

// General elements.
const overlay                       = document.getElementById("overlay");
const window_select_modal           = document.getElementById("windowSelectModal");
const window_select_options         = document.getElementById("windowSelectOptionsContainer");
const close_window_select_modal_btn = document.getElementById("closeWindowSelectModalBtn");



/*** ADD HANDLERS TO BUTTONS ***/

// Main menu button handlers.
save_current_window_btn.addEventListener("click", saveOrUpdateCurrentWindow);
open_saved_window_btn.addEventListener("click", handleOpenSavedWindow);
swap_with_btn.addEventListener("click", handleSwapWith);

// Handlers for buttons in window select options container.
window_select_options.addEventListener("click", async (event) => {
  if (event.target.matches(".window-open-btn")) {  // Add event listener for opening a saved window.
    const window_open_btn  = event.target;
    const window_name      = window_open_btn.dataset.windowName;
    const windows_data_obj = (await chrome.storage.sync.get("windows")).windows;

    Helpers.closeModal(window_select_modal);

    const tab_urls   = windows_data_obj[window_name].tab_urls;
    const new_window = await chrome.windows.create(
      {url: tab_urls, state: "maximized"}
    );

    windows_data_obj[window_name].window_ids.push(new_window.id);
    chrome.storage.sync.set({[new_window.id] : window_name});

    // Update window data object in storage
    chrome.storage.sync.set({"windows" : windows_data_obj});
  } else if (event.target.matches(".window-rename-btn")) {  // Add event listener for renaming a saved window.
    const window_rename_btn = event.target;
    const old_window_name   = window_rename_btn.dataset.windowName;
    const windows_data_obj  = (await chrome.storage.sync.get("windows")).windows;

    Helpers.closeModal(window_select_modal);

    const new_window_name  = await Helpers.getValidWindowNameFromUser(
      windows_data_obj, old_window_name
    );

    // Return early if window name was null (i.e., the user gave the same name
    // as the one the window already had).
    if (new_window_name === null) return;

    console.log(`Renaming "${old_window_name}" as "${new_window_name}"...`);

    windows_data_obj[new_window_name] = windows_data_obj[old_window_name];
    delete windows_data_obj[old_window_name];

    // Update window_id:window_name pairs with new window name.
    const window_ids = windows_data_obj[new_window_name].window_ids;
    for (const window_id of window_ids) {
      chrome.storage.sync.set({[window_id] : new_window_name});
    }

    // Update window data object in storage.
    chrome.storage.sync.set({"windows" : windows_data_obj});
  } else if (event.target.matches(".window-remove-btn")) {  // Add event listener for removing a saved window.
    const window_remove_btn = event.target;
    const window_name       = window_remove_btn.dataset.windowName;
    const windows_data_obj  = (await chrome.storage.sync.get("windows")).windows;

    Helpers.closeModal(window_select_modal);

    const window_ids = windows_data_obj[window_name].window_ids;
    for (const window_id of window_ids) {
      chrome.storage.sync.remove([window_id.toString()]);
    }

    delete windows_data_obj[window_name];

    // Update windows data object in storage.
    chrome.storage.sync.set({"windows" : windows_data_obj});
  } else if (event.target.matches(".swap-option-btn")) {  // Add event listener for opening a saved window to swap with.
    const window_open_btn   = event.target;
    const window_name       = window_open_btn.dataset.windowName;
    const current_window_id = (await chrome.windows.getCurrent()).id.toString();

    Helpers.closeModal(window_select_modal);

    // Return early if user selects the current window to swap with.
    const data                = await chrome.storage.sync.get([current_window_id]);
    const current_window_name = data[current_window_id];
    if (current_window_name === window_name) {
      console.log("swap with same");
      return;
    }

    // Save or update the current window before closing it.
    await saveOrUpdateCurrentWindow();

    const windows_data_obj = (await chrome.storage.sync.get("windows")).windows;
    const tab_urls         = windows_data_obj[window_name].tab_urls;

    // Close current window and open selected window.
    chrome.windows.remove(current_window_id);
    const new_window = await chrome.windows.create(
      {url: tab_urls, state: "maximized"}
    );

    windows_data_obj[window_name].window_ids.push(new_window.id);
    chrome.storage.sync.set({[new_window.id] : window_name});

    // Update window data object in storage
    chrome.storage.sync.set({"windows" : windows_data_obj});
  }
});

// Other general buttons with simple handlers.
overlay.addEventListener("click", () => {
  Helpers.closeModal(input_text_modal);
});
close_window_select_modal_btn.addEventListener("click", () => {
  Helpers.closeModal(window_select_modal);
});



/*** HANDLERS ***/

/** Handler for 'save_current_window_btn'. */
async function saveOrUpdateCurrentWindow() {
  // Get this window's current list of tabs to be saved to storage.
  const tabs     = await chrome.tabs.query({currentWindow: true});
  let   tab_urls = [];

  for (const tab of tabs) {
    tab_urls.push(tab.url);
  }

  const current_window_id = (await chrome.windows.getCurrent()).id.toString();

  // Get the name of the window with the current window ID, if it exists.
  const window_names_data = await chrome.storage.sync.get([current_window_id]);
  const saved_window_name = window_names_data[current_window_id];
  const windows_data      = await chrome.storage.sync.get("windows");
  let   windows_data_obj  = windows_data.windows || {};

  // Save (or update, if it was already a saved window in the first place) the
  //  current window with the correct data (array of current tab URLs).
  if (saved_window_name === undefined) {  // Current window does NOT map to saved window.
    // Get user input from input modal for name of window.
    const window_name = await Helpers.getValidWindowNameFromUser(
      windows_data_obj
    );

    // Map current window's ID to the saved window name.
    chrome.storage.sync.set({[current_window_id] : window_name});

    // Add new window object to windows data object.
    windows_data_obj[window_name] = {
      tab_urls : tab_urls,
      window_ids : [current_window_id]
    }

    // Save the window data.
    chrome.storage.sync.set({"windows" : windows_data_obj});
    console.log(`(saved new window "${window_name}")`);
  } else {  // Current window DOES map to saved window.
    // Update saved window data.
    windows_data_obj[saved_window_name].tab_urls = tab_urls;
    windows_data_obj[saved_window_name].window_ids.push(current_window_id);

    // Update window data object in storage.
    chrome.storage.sync.set({"windows" : windows_data_obj});
    console.log(`(updated "${saved_window_name}")`);
  }
}

/** Handler for 'open_saved_window_btn'. */
async function handleOpenSavedWindow() {
  // Update window_select_modal to the user's current list of saved windows.
  const windows_data     = await chrome.storage.sync.get("windows");
  const windows_data_obj = windows_data.windows;

  // Add list of saved windows to HTML with open, rename, and remove buttons.
  let windows_list_options_html = "";
  for (const window_name in windows_data_obj) {
    windows_list_options_html +=
      `<div class="window-select-option-btns-container">
        <button class="window-open-btn" data-window-name="${window_name}">
          ${window_name}
        </button>
        <button class="window-rename-btn" data-window-name="${window_name}">
          <img class="btn-image" src="../images/edit-icon.png" alt="E">
        </button>
        <button class="window-remove-btn" data-window-name="${window_name}">
          <img class="btn-image" src="../images/trash-icon.png" alt="X">
        </button>
      </div>`;
  }
  window_select_options.innerHTML = windows_list_options_html;

  // Modal is closed by event handlers for the above buttons.
  Helpers.openModal(window_select_modal);
}

/** Handler for 'swap_with_btn'. */
async function handleSwapWith() {
  console.log("'swapWithBtn' was clicked...");

  // Update window_select_modal to the user's current list of saved windows.
  const windows_data     = await chrome.storage.sync.get("windows");
  const windows_data_obj = windows_data.windows;

  // Add list of saved windows to HTML.
  let windows_list_options_html = "";
  for (const window_name in windows_data_obj) {
    windows_list_options_html +=
      `<button class="swap-option-btn" data-window-name="${window_name}">
        ${window_name}
      </button>`;
  }
  window_select_options.innerHTML = windows_list_options_html;

  Helpers.openModal(window_select_modal);
}
