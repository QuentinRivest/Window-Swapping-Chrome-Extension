/*** HTML ELEMENTS ***/

// General.
const overlay = document.getElementById("overlay");

// Elements for when the user is selecting a window from their saved windows.
const window_select_modal           = document.getElementById("windowSelectModal");
const window_select_options         = document.getElementById("windowSelectOptionsContainer");
const close_window_select_modal_btn = document.getElementById("closeWindowSelectModalBtn");



/*** EXPORTED HELPERS ***/

/** Toggles the given modal ON, making it visible and interactable to the user. */
export function openModal(modal) {
  if (modal == null) return;

  overlay.classList.add("active");
  modal.classList.add("active");
}

/** Toggles the given modal OFF. */
export function closeModal(modal) {
  if (modal == null) return;

  modal.classList.remove("active");
  overlay.classList.remove("active");
}

/** Makes the program wait until the user hits enter. */
export function waitForEnterKey() {
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

/** Activates 'window_select_modal' with ONLY open options. */
async function activateWindowSelectModalWithOpen() {
  // Update window_select_modal to the user's current list of saved windows.
  const windows_data       = await chrome.storage.sync.get("windows");
  const windows_data_obj   = windows_data.windows;

  let windows_list_options_html = "";
  for (const window_name in windows_data_obj) {
    const escaped_window_name = convertToEscapedString(window_name);
    windows_list_options_html += "<button class='window-select-option-btn'"
    + "id='" + escaped_window_name + "'>"
    + escaped_window_name + "</button>";
  }
  window_select_options.innerHTML = windows_list_options_html;

  // Activate buttons with proper handlers to open their corresponding windows.
  const window_option_btns = document.querySelectorAll(".window-select-option-btn");

  console.log("There are " + window_option_btns.length + " windows in storage.");
  for (const window_option_btn of window_option_btns) {
    const window_name = convertToUnescapedString(window_option_btn.id);

    console.log("Adding event listener to " + window_name + "...");
    window_option_btn.addEventListener("click", async () => {
      closeModal(window_select_modal);

      // Open a new window, maximized, with the saved window's tabs.
      const tab_urls   = windows_data_obj[window_name];
      const new_window = await chrome.windows.create(
        {url: tab_urls, state: "maximized"}
      );

      // Map this new window's ID to the saved window's name.
      chrome.storage.sync.set({[new_window.id] : window_name});
    });
  }

  close_window_select_modal_btn.addEventListener("click", () => {
    closeModal(window_select_modal);
  });

  openModal(window_select_modal);
}

// TODO: implement edit and remove functionality.
/** Activates 'window_select_modal' with OPEN/EDIT/REMOVE options.
 * 'EDIT': rename the window. 'REMOVE': remove the window from storage.
*/
export function activateWindowSelectModalWithOpenEditRemove() {
  // Placeholder:
  activateWindowSelectModalWithOpen();
  console.log("'activateWindowSelectModalWithEditAndRemove' function not yet implemented. :(");

  // activateWindowSelectModalWithGivenHandler( /*...*/ );
}



/*** LOCAL HELPERS ***/

/** Returns a version of the given string that's safe inside single AND double
  * quotes.
  * Escapes any quotes (' and ") and "\" characters.
  */
function convertToEscapedString(str) {
  let escaped_str = "";

  for (let i = 0; i < str.length; ++i) {
    const ch = str[i];

    if (ch == "'" || ch ==  '"' || ch == "\\") {
      escaped_str += "\\";
    }

    escaped_str += ch;
  }

  return escaped_str;
}

/** Returns the given string with any unescaped "\" characters removed.
  * Undoes the affect of convertToEscapedString function.
  */
function convertToUnescapedString(str = "") {
  let unescaped_str   = "";
  let last_was_escape = false;

  for (let i = 0; i < str.length; ++i) {
    const ch = str[i];

    if (last_was_escape || ch != "\\") {
      unescaped_str += ch;
    } else {  // 'ch' is a unescaped "\" character.
      last_was_escape = true;
    }
  }

  return unescaped_str;
}
