/*** HTML ELEMENTS ***/

// Elements for input text box.
const input_text_modal = document.getElementById("inputTextModal");
const input_textbox    = document.getElementById("inputTextbox");
const input_error_msg  = input_text_modal.querySelector(".input-error-msg");

// General elements.
const overlay                     = document.getElementById("overlay");
const user_confirmation_modal     = document.getElementById("userConfirmationModal");
const confirmation_btns_container = document.getElementById("confirmationBtnsContainer");
const window_select_options       = document.getElementById("windowSelectOptionsContainer");



/*** EXPORTED HELPERS ***/

/** Toggles the given modal ON, making it visible and interactable to the user. */
export function openModal(modal, use_overlay=true) {
  if (modal == null) return;

  if (use_overlay) overlay.classList.add("active");
  modal.classList.add("active");
}

/** Toggles the given modal OFF. */
export function closeModal(modal) {
  if (modal == null) return;

  modal.classList.remove("active");
  overlay.classList.remove("active");
}

/** Updates the window_select_modal HTML display. */
export async function updateWindowSelectModalHtml() {
  // Update window_select_modal to the user's current list of saved windows.
  const windows_data_obj = (await chrome.storage.sync.get("windows")).windows;

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
}

/** Gets a valid window name from the user.
  * If the user gives an invalid name, it loops until given a valid one.
  */
export async function getValidWindowNameFromUser(windows_data_obj,
                                                 allowed_duplicates=new Set()) {
  const unsafe_chars = ["\"", "&", "<", ">"];
  let window_name    = "";
  let error_msg      = "";
  let input_is_valid = false;

  while (!input_is_valid) {
    window_name = await getUserInputWithTextbox(error_msg);

    // If name is no different from
    if (allowed_duplicates.has(window_name)) return null;

    // Check for duplicates.
    input_is_valid = !(window_name in windows_data_obj);

    // If the name wasn't a duplicate, check for unsafe characters too.
    if (input_is_valid) {
      for (const ch of unsafe_chars) {
        if (window_name.includes(ch)) {
          input_is_valid = false;
          error_msg = `Cannot contain [${ch}] character.`;
          break;
        }
      }
    } else {
      error_msg = "Window name already exists; please choose another.";
    }
  }

  return window_name;
}

/** Gets user confirmation (yes/no) with popup modal.
  * Returns true if user clicks 'Yes', false otherwise.
  */
export async function getUserConfirmation(msg="Are you sure?") {
  openModal(user_confirmation_modal);
  const clicked_target = await waitForClickAndGetTarget(confirmation_btns_container);
  closeModal(user_confirmation_modal);

  return clicked_target.matches(".yes-confirmation-btn");
}



/*** LOCAL HELPERS ***/

/** Makes the program wait until the user hits enter. */
function waitForEnterKey() {
  return new Promise((resolve) => {
    function enterKeyHandler(event) {
      if (event.code == "Enter") {
        document.removeEventListener("keydown", enterKeyHandler);
        resolve();
      }
    }
    document.addEventListener("keydown", enterKeyHandler);
  });
}

/** Returns user input from text box. */
async function getUserInputWithTextbox(error_msg="") {
  // Clear any previous input.
  input_textbox.value = "";
  if (error_msg.length > 0) {
    input_error_msg.textContent = error_msg;
  }
  openModal(input_text_modal);
  input_textbox.focus();

  await waitForEnterKey();
  const user_input_str = input_textbox.value;

  // Clear error message.
  input_error_msg.textContent = "";
  closeModal(input_text_modal);

  return user_input_str;
}

/** Makes the program wait until the user clicks, returning the target. */
function waitForClickAndGetTarget(optional_parent_element=document) {
  return new Promise((resolve) => {
    function clickHandler(event) {
      optional_parent_element.removeEventListener("click", clickHandler);
      resolve(event.target);
    }
    optional_parent_element.addEventListener("click", clickHandler);
  });
}
