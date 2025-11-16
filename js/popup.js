// If a saved window is open along with a bunch of not-saved windows, there
//  needs to be a way to differentiate it from the non-saved windows, as the
//  behavior is rather different.
  // If the window being saved/swapped exists, then it that window's data needs
  //  to be updated, but between the time it was loaded and when it's saved
  //  again, it could've completely changed (could have no tabs in common).
  //  Maybe there's a unique identifier that a window has for differentiating
  //  when multiple Chrome windows are open.
  // Then, of course, if the window is not a saved window, then the extension
  //  would have to create a new window in storage.
//

// Elements for saving a window.
const save_current_window_btn = document.getElementById("saveCurrentWindowBtn");
const input_text_modal        = document.getElementById("inputTextModal");
const input_textbox           = document.getElementById("inputTextbox");
const overlay                 = document.getElementById("overlay");

// Elements for opening a saved window.
const open_saved_window_btn         = document.getElementById("openSavedWindowBtn");
const window_select_modal           = document.getElementById("windowSelectModal");
const window_select_options         = document.getElementById("windowSelectOptionsContainer");
const close_window_select_modal_btn = document.getElementById("closeWindowSelectModalBtn");

// Elements for swapping windows (the current window with a saved window).
const swap_with_btn = document.getElementById("swapWithBtn");

function openModal(modal) {
  if (modal == null) return;

  overlay.classList.add("active");
  modal.classList.add("active");
}

function closeModal(modal) {
  if (modal == null) return;

  modal.classList.remove("active");
  overlay.classList.remove("active");
}

function waitForEnterKey() {
  return new Promise((resolve) => {
    function enterKeyHandler(event) {
      if (event.code == "Enter") {
        document.removeEventListener("keydown", enterKeyHandler);
        resolve();
      }
    }
    document.addEventListener("keydown", enterKeyHandler);
  })
}

async function saveCurrentWindow() {
  console.log("Saving window...");

  const tabs     = await chrome.tabs.query({currentWindow: true});
  let   tab_urls = [];

  for (const tab of tabs) {
    tab_urls.push(tab.url);
  }

  const current_window_id = (await chrome.windows.getCurrent()).id.toString();

  // Get the name of the window with the current window ID, if it exists.
  console.log("Getting current window id...");
  const window_names_data = await chrome.storage.sync.get([current_window_id]);
  const saved_window_name = window_names_data[current_window_id];
  const windows_data      = await chrome.storage.sync.get("windows");
  let   windows_data_obj  = windows_data.windows || {};

  // Save (or update, if it was already a saved window in the first place) the
  //  current window with the correct data (array of current tab URLs).
  if (saved_window_name === undefined) {  // Current window does NOT map to saved window.
    // Get user input from input modal for name of window.

    // Clear any previous input.
    input_textbox.value = "";
    openModal(input_text_modal);
    input_textbox.focus();
    // TODO: Add safety against duplicate window names.
    await waitForEnterKey();
    let window_name = input_textbox.value;
    closeModal(input_text_modal);

    // Map current window's ID to the saved window name.
    chrome.storage.sync.set({[current_window_id] : window_name});
    // Save the window data.
    windows_data_obj[window_name] = tab_urls;
    chrome.storage.sync.set({"windows" : windows_data_obj});
  } else {  // Current window DOES map to saved window.
    console.log("(updating " + saved_window_name + ")");
    // Update saved window data.
    windows_data_obj[saved_window_name] = tab_urls;
    chrome.storage.sync.set({"windows" : windows_data_obj});
  }
}

async function openSavedWindow() {
  console.log("Opening saved window...");

  // Open a new window.
  const windows_data     = await chrome.storage.sync.get("windows");
  const windows_data_obj = windows_data.windows;

  // Display saved windows and collect user selection.
  let windows_list_options_html = "";
  for (const window_name in windows_data_obj) {
    windows_list_options_html += '<button class="window-select-option-btn"'
                               + 'id="' + window_name + '">'
                               + window_name + '</button>';
  }
  window_select_options.innerHTML = windows_list_options_html;

  const window_option_btns = document.querySelectorAll(".window-select-option-btn");
  console.log("There are " + window_option_btns.length + " windows in storage.");
  for (const window_option_btn of window_option_btns) {
    console.log("Adding event listener to " + window_option_btn.id + "...");
    window_option_btn.addEventListener("click", () => {
      console.log(window_option_btn.id + " was clicked! :D");

      closeModal(window_select_modal);

      const tab_urls_to_open = windows_data_obj[window_option_btn.id];
      chrome.windows.create({url : tab_urls_to_open});
    });
  }

  openModal(window_select_modal);

  // Map new window's ID to saved window's name.
  // Populate new window with saved window tabs.
}

function swapWith() {
  console.log("'swapWithBtn' was clicked...");

  // Allow user to pick which window out of the saved windows they have that
  //  they'd like to swap with.
  // If the window already exists, update the saved window data -- if not, save
  //  the new window, allowing the user to name it.
    // Alsooo, could support default naming somehow?
  // Then close this window and open the swapped one.
    // Not sure how this'll work, since if you close the current window the
    //  whole chrome browser might be closed, so Idk if the extension'll still
    //  be able to do its thing. Might have to open the new window and THEN
    //  close the current one.
}

close_window_select_modal_btn.addEventListener("click", () => {
  closeModal(window_select_modal);
});
save_current_window_btn.addEventListener("click", saveCurrentWindow);
open_saved_window_btn.addEventListener("click", openSavedWindow);
swap_with_btn.addEventListener("click", swapWith);
