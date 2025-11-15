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

const save_current_window_btn = document.getElementById("saveCurrentWindowBtn");
const swap_with_btn           = document.getElementById("swapWithBtn");
const open_saved_window_btn   = document.getElementById("openSavedWindowBtn");

async function saveCurrentWindow() {
  console.log("Saving window...");

  const tabs     = await chrome.tabs.query({currentWindow: true});
  let   tab_urls = [];

  for (const tab of tabs) {
    tab_urls.push(tab.url);
  }

  const current_window_id = (await chrome.windows.getCurrent()).id.toString();
  let window_name         = "NEW WINDOW";

  console.log("About to get current window id.");
  chrome.storage.sync.get([current_window_id]).then((data) => {
    console.log("Getting current window id...");

    const saved_window_name = data.current_window_id;
    if (saved_window_name !== undefined) {
      console.log("(saving " + saved_window_name + ")");
      window_name = saved_window_name;
    } else {
      console.log("Storing " + current_window_id + " with " + window_name + ".");

      // TODO: Allow user to set name for new saved window.
      chrome.storage.sync.set({[current_window_id] : window_name});
    }
  })
  chrome.storage.sync.set({"windows" : {[window_name] : tab_urls}});
}

async function openSavedWindow() {
  console.log("Opening saved window...")

  // Open a new window.
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

save_current_window_btn.addEventListener("click", saveCurrentWindow);
open_saved_window_btn.addEventListener("click", openSavedWindow);
swap_with_btn.addEventListener("click", swapWith);
