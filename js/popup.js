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
const input_textbox           = document.getElementById("inputTextbox");

// Elements for opening a saved window.
const open_saved_window_btn         = document.getElementById("openSavedWindowBtn");

// Elements for swapping the current window with a saved window.
const swap_with_btn = document.getElementById("swapWithBtn");



/*** ADD HANDLERS TO BUTTONS ***/

save_current_window_btn.addEventListener("click", handleSaveCurrentWindow);
open_saved_window_btn.addEventListener("click", handleOpenSavedWindow);
swap_with_btn.addEventListener("click", handleSwapWith);



/*** HANDLERS ***/

/** Handler for 'save_current_window_btn'. */
async function handleSaveCurrentWindow() {
  console.log("Saving window...");

  // Get this window's current list of tabs to be saved to storage.
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
    Helpers.openModal(input_text_modal);
    input_textbox.focus();
    // TODO: Add safety against duplicate window names.
    await Helpers.waitForEnterKey();
    let window_name = input_textbox.value;
    Helpers.closeModal(input_text_modal);

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

/** Handler for 'open_saved_window_btn'. */
async function handleOpenSavedWindow() {
  console.log("Opening saved window...");

  // Open a new window.
  const windows_data     = await chrome.storage.sync.get("windows");
  const windows_data_obj = windows_data.windows;

  Helpers.activateWindowSelectModalWithOpenEditRemove();
}

/** Handler for 'swap_with_btn'. */
function handleSwapWith() {
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
