import tkinter as tk
from tkinter import filedialog, messagebox
import pygame
import json
import os
import logging  # Import the logging module
import sys

# Configure logging to output to both a file and the console
logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

# File handler for logging to a file
file_handler = logging.FileHandler('app.log', mode='a', encoding='utf-8')
file_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(file_formatter)
logger.addHandler(file_handler)

# Stream handler for logging to the console
stream_handler = logging.StreamHandler(sys.stdout)
stream_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
stream_handler.setFormatter(stream_formatter)
logger.addHandler(stream_handler)

def main():
    # Initialize Pygame Mixer
    try:
        pygame.mixer.init()
        logging.info("Pygame mixer initialized successfully.")
    except Exception as e:
        logging.error(f"Failed to initialize Pygame mixer: {e}")
        messagebox.showerror("Error", f"Failed to initialize Pygame mixer: {e}")
        sys.exit(1)  # Exit the script if Pygame fails to initialize

    is_sound_playing = False

    # Mapping of categories to their respective JSON filenames and base paths
    CATEGORY_CONFIG = {
        "Ambiance Sounds": {
            "json_filename": "ambianceSounds.json",
            "base_path": "assets/ambiance/"
        },
        "Background Music": {
            "json_filename": "backgroundMusic.json",
            "base_path": "assets/background/"
        },
        "Soundboard": {
            "json_filename": "soundboard.json",
            "base_path": "assets/soundboard/"
        }
    }

    # Initialize variables
    json_file_path = ""
    json_data = []
    current_index = 0
    current_category = ""

    # Function to play sound based on selected category and JSON data
    def play_sound():
        nonlocal is_sound_playing
        current_category = category_var.get()
        logging.debug(f"Attempting to play sound for category '{current_category}', index {current_index}.")

        if not current_category:
            logging.warning("No category selected when attempting to play sound.")
            messagebox.showwarning("Warning", "Please select a category before playing a sound.")
            return

        if is_sound_playing:
            pygame.mixer.music.stop()
            logging.info("Stopped currently playing sound.")
            is_sound_playing = False
            return

        if not json_data:
            logging.error("JSON data is empty.")
            messagebox.showerror("Error", "JSON data is empty.")
            return

        if current_index < 0 or current_index >= len(json_data):
            logging.error(f"Current index {current_index} is out of range.")
            messagebox.showerror("Error", "Current index is out of range.")
            return

        current_entry = json_data[current_index]
        filename = current_entry.get("filename")
        logging.debug(f"Selected entry: {current_entry}")

        if not filename:
            logging.error("No filename specified in the JSON data.")
            messagebox.showerror("Error", "No filename specified in the JSON data.")
            return

        base_path = CATEGORY_CONFIG[current_category]["base_path"]
        sound_path = os.path.join(base_path, filename)
        logging.debug(f"Sound path resolved to: {sound_path}")

        if not os.path.exists(sound_path):
            logging.error(f"Sound file does not exist: {sound_path}")
            messagebox.showerror("Error", f"Sound file does not exist: {sound_path}")
            return

        try:
            pygame.mixer.music.load(sound_path)
            pygame.mixer.music.play()
            is_sound_playing = True
            logging.info(f"Playing sound: {sound_path}")
        except Exception as e:
            logging.error(f"Could not play sound '{sound_path}': {e}")
            messagebox.showerror("Error", f"Could not play sound: {str(e)}")

    # Function to check for duplicates within a category
    def check_duplicates(new_filename, new_display_name, exclude_index=None):
        logging.debug("Checking for duplicates.")
        for idx, entry in enumerate(json_data):
            if exclude_index is not None and idx == exclude_index:
                continue
            if entry.get("filename", "").lower() == new_filename.lower():
                logging.warning(f"Duplicate filename found: {new_filename} at index {idx}.")
                return f"A sound with the filename '{new_filename}' already exists."
            if entry.get("display_name", "").lower() == new_display_name.lower():
                logging.warning(f"Duplicate display name found: {new_display_name} at index {idx}.")
                return f"A sound with the display name '{new_display_name}' already exists."
        logging.debug("No duplicates found.")
        return None

    # Function to create GUI form fields based on JSON keys and data types
    def create_form(current_category, json_data, current_index=None):
        logging.debug(f"Creating form for category '{current_category}', index {current_index}.")
        for widget in form_frame.winfo_children():
            widget.destroy()

        entry_widgets = {}

        if current_index is not None:
            if current_index < 0 or current_index >= len(json_data):
                logging.error(f"Current index {current_index} is out of range.")
                messagebox.showerror("Error", "Current index is out of range.")
                return

            current_entry = json_data[current_index]
            logging.debug(f"Editing entry: {current_entry}")
            row = 0

            for key, value in current_entry.items():
                if key == "contexts" and isinstance(value, list):
                    tk.Label(form_frame, text=f"{key.capitalize()} (format: type - context, separated by commas):").grid(row=row, column=0, sticky=tk.W)
                    contexts_str = ", ".join([f"{ctx[0]} - {ctx[1]}" for ctx in value])
                    text_widget = tk.Text(form_frame, height=4, width=40)
                    text_widget.insert(tk.END, contexts_str)
                    text_widget.grid(row=row, column=1, padx=10, pady=10, sticky="ew")
                    entry_widgets[key] = text_widget
                    logging.debug(f"Loaded contexts: {contexts_str}")
                elif isinstance(value, list):
                    tk.Label(form_frame, text=f"{key.capitalize()} (comma-separated):").grid(row=row, column=0, sticky=tk.W)
                    entry_widget = tk.Entry(form_frame, width=40)
                    entry_widget.insert(0, ", ".join(value))
                    entry_widget.grid(row=row, column=1, padx=10, pady=10, sticky="ew")
                    entry_widgets[key] = entry_widget
                    logging.debug(f"Loaded list field '{key}': {value}")
                else:
                    tk.Label(form_frame, text=f"{key.capitalize()}:").grid(row=row, column=0, sticky=tk.W)
                    entry_widget = tk.Entry(form_frame, width=40)
                    entry_widget.insert(0, str(value))
                    entry_widget.grid(row=row, column=1, padx=10, pady=10, sticky="ew")
                    entry_widgets[key] = entry_widget
                    logging.debug(f"Loaded field '{key}': {value}")
                row += 1

            # Navigation buttons
            nav_frame = tk.Frame(form_frame)
            nav_frame.grid(row=row, column=0, columnspan=2, pady=10)
            if current_index > 0:
                tk.Button(nav_frame, text="Previous", command=lambda: navigate(-1)).pack(side=tk.LEFT, padx=5)
            if current_index < len(json_data) - 1:
                tk.Button(nav_frame, text="Next", command=lambda: navigate(1)).pack(side=tk.LEFT, padx=5)

            # Update button
            tk.Button(form_frame, text="Update Entry", command=lambda: update_entry(current_category, entry_widgets, current_index)).grid(row=row+1, column=0, columnspan=2, padx=10, pady=10)
            logging.debug("Form for editing entry created.")

        else:
            # Form for adding a new entry
            messagebox.showinfo("Info", f"Adding a new entry for category '{current_category}'.")
            logging.info(f"Adding a new entry for category '{current_category}'.")
            first_entry = {}

            row = 0

            # Determine the structure based on existing entries or predefined keys
            if json_data:
                first_entry = json_data[0]
            else:
                # Define default keys if JSON is empty
                first_entry = {
                    "filename": "",
                    "display_name": "",
                    "contexts": [],
                    "credit": ""
                }

            for key in first_entry.keys():
                tk.Label(form_frame, text=f"{key.capitalize()}:").grid(row=row, column=0, sticky=tk.W)
                if key == "contexts":
                    text_widget = tk.Text(form_frame, height=4, width=40)
                    text_widget.grid(row=row, column=1, padx=10, pady=10)
                    entry_widgets[key] = text_widget
                    logging.debug("Initialized 'contexts' text widget.")
                elif isinstance(first_entry[key], list):
                    entry_widget = tk.Entry(form_frame, width=40)
                    entry_widget.grid(row=row, column=1, padx=10, pady=10)
                    entry_widgets[key] = entry_widget
                    logging.debug(f"Initialized list field '{key}'.")
                else:
                    entry_widget = tk.Entry(form_frame, width=40)
                    entry_widget.grid(row=row, column=1, padx=10, pady=10)
                    entry_widgets[key] = entry_widget
                    logging.debug(f"Initialized field '{key}'.")
                row += 1

            # Add button
            tk.Button(form_frame, text="Add Entry", command=lambda: add_entry(current_category, entry_widgets, json_data)).grid(row=row, column=0, columnspan=2, padx=10, pady=10)
            logging.debug("Form for adding new entry created.")

        return entry_widgets

    # Function to add a new entry to the JSON file
    def add_entry(current_category, entry_widgets, json_data):
        logging.debug(f"Adding new entry to category '{current_category}'.")
        new_entry = {}
        new_filename = ""
        new_display_name = ""

        for key, widget in entry_widgets.items():
            if key == "contexts" and isinstance(widget, tk.Text):
                text_content = widget.get("1.0", tk.END).strip()
                if text_content:
                    try:
                        new_entry[key] = [tuple(item.strip().split(" - ")) for item in text_content.split(",")]
                        logging.debug(f"Parsed contexts: {new_entry[key]}")
                    except Exception as e:
                        logging.error(f"Error parsing contexts: {e}")
                        messagebox.showerror("Error", "Invalid format for contexts. Use 'type - context' separated by commas.")
                        return
                else:
                    new_entry[key] = []
                    logging.debug("No contexts provided; initializing empty list.")
            elif isinstance(widget, tk.Entry):
                entry_value = widget.get().strip()
                if entry_value:
                    if key == "contexts":
                        try:
                            new_entry[key] = [tuple(item.strip().split(" - ")) for item in entry_value.split(",")]
                            logging.debug(f"Parsed contexts from entry widget: {new_entry[key]}")
                        except Exception as e:
                            logging.error(f"Error parsing contexts from entry widget: {e}")
                            messagebox.showerror("Error", "Invalid format for contexts. Use 'type - context' separated by commas.")
                            return
                    else:
                        new_entry[key] = entry_value
                        if key == "filename":
                            new_filename = entry_value
                            logging.debug(f"Set new filename: {new_filename}")
                        if key == "display_name":
                            new_display_name = entry_value
                            logging.debug(f"Set new display name: {new_display_name}")
                else:
                    new_entry[key] = ""
                    logging.debug(f"No value provided for '{key}'; initializing as empty string.")
            else:
                new_entry[key] = widget.get().strip()
                logging.debug(f"Set field '{key}' to '{new_entry[key]}'.")
        
        # Check for duplicates within the current category
        duplicate_warning = check_duplicates(new_filename, new_display_name)
        if duplicate_warning:
            logging.warning(f"Duplicate detected while adding entry: {duplicate_warning}")
            messagebox.showwarning("Duplicate Detected", duplicate_warning)
            return

        json_data.append(new_entry)
        logging.info(f"Added new entry: {new_entry}")

        try:
            with open(json_file_path, "w", encoding="utf-8") as file:
                json.dump(json_data, file, indent=4, ensure_ascii=False)
            logging.info(f"Successfully wrote new entry to '{json_file_path}'.")
        except Exception as e:
            logging.error(f"Could not write to JSON file '{json_file_path}': {e}")
            messagebox.showerror("Error", f"Could not write to JSON file: {str(e)}")
            return

        messagebox.showinfo("Success", "New entry added successfully!")
        create_form(current_category, json_data)
        logging.debug("Added entry form refreshed.")

    # Function to update an existing entry in the JSON file
    def update_entry(current_category, entry_widgets, current_index):
        logging.debug(f"Updating entry at index {current_index} in category '{current_category}'.")
        updated_entry = {}
        updated_filename = ""
        updated_display_name = ""

        for key, widget in entry_widgets.items():
            if key == "contexts" and isinstance(widget, tk.Text):
                text_content = widget.get("1.0", tk.END).strip()
                if text_content:
                    try:
                        updated_entry[key] = [tuple(item.strip().split(" - ")) for item in text_content.split(",")]
                        logging.debug(f"Parsed updated contexts: {updated_entry[key]}")
                    except Exception as e:
                        logging.error(f"Error parsing updated contexts: {e}")
                        messagebox.showerror("Error", "Invalid format for contexts. Use 'type - context' separated by commas.")
                        return
                else:
                    updated_entry[key] = []
                    logging.debug("No contexts provided; initializing empty list.")
            elif isinstance(widget, tk.Entry):
                entry_value = widget.get().strip()
                if entry_value:
                    if key == "contexts":
                        try:
                            updated_entry[key] = [tuple(item.strip().split(" - ")) for item in entry_value.split(",")]
                            logging.debug(f"Parsed updated contexts from entry widget: {updated_entry[key]}")
                        except Exception as e:
                            logging.error(f"Error parsing updated contexts from entry widget: {e}")
                            messagebox.showerror("Error", "Invalid format for contexts. Use 'type - context' separated by commas.")
                            return
                    else:
                        updated_entry[key] = entry_value
                        if key == "filename":
                            updated_filename = entry_value
                            logging.debug(f"Set updated filename: {updated_filename}")
                        if key == "display_name":
                            updated_display_name = entry_value
                            logging.debug(f"Set updated display name: {updated_display_name}")
                else:
                    updated_entry[key] = ""
                    logging.debug(f"No value provided for '{key}'; initializing as empty string.")
            else:
                updated_entry[key] = widget.get().strip()
                logging.debug(f"Set field '{key}' to '{updated_entry[key]}'.")
        
        # Check for duplicates within the current category, excluding the current entry
        duplicate_warning = check_duplicates(updated_filename, updated_display_name, exclude_index=current_index)
        if duplicate_warning:
            logging.warning(f"Duplicate detected while updating entry: {duplicate_warning}")
            messagebox.showwarning("Duplicate Detected", duplicate_warning)
            return

        json_data[current_index] = updated_entry
        logging.info(f"Updated entry at index {current_index}: {updated_entry}")

        try:
            with open(json_file_path, "w", encoding="utf-8") as file:
                json.dump(json_data, file, indent=4, ensure_ascii=False)
            logging.info(f"Successfully wrote updated entry to '{json_file_path}'.")
        except Exception as e:
            logging.error(f"Could not write to JSON file '{json_file_path}': {e}")
            messagebox.showerror("Error", f"Could not write to JSON file: {str(e)}")
            return

        messagebox.showinfo("Success", "Entry updated successfully!")
        create_form(current_category, json_data, current_index)
        logging.debug("Updated entry form refreshed.")

    # Function to navigate through the JSON entries
    def navigate(direction):
        nonlocal current_index
        new_index = current_index + direction
        logging.debug(f"Navigating from index {current_index} to {new_index}.")
        if 0 <= new_index < len(json_data):
            current_index = new_index
            create_form(current_category, json_data, current_index)
        else:
            logging.warning(f"Navigation attempted out of range: {new_index}.")
            messagebox.showwarning("Warning", "No more entries in this direction.")

    # Function to open a JSON file based on selected category
    def open_json_file():
        nonlocal json_file_path, json_data, current_index, current_category
        selected_cat = category_var.get()
        logging.debug(f"Selected category: {selected_cat}")
        if not selected_cat:
            logging.error("No category selected when attempting to open JSON file.")
            messagebox.showerror("Error", "Please select a category before opening a JSON file.")
            return

        # Define the srv_data directory relative to the script's location
        srv_data_dir = os.path.join(os.getcwd(), "srv_data")
        logging.debug(f"Resolved srv_data directory to: {srv_data_dir}")
        
        if not os.path.exists(srv_data_dir):
            logging.error(f"The directory 'srv_data' does not exist at {srv_data_dir}.")
            messagebox.showerror("Error", f"The directory 'srv_data' does not exist at {srv_data_dir}.")
            return

        json_filename = CATEGORY_CONFIG[selected_cat]["json_filename"]
        json_file_path = os.path.join(srv_data_dir, json_filename)
        logging.debug(f"Resolved JSON file path to: {json_file_path}")

        if not os.path.exists(json_file_path):
            # Prompt user to create a new JSON file if it doesn't exist
            logging.warning(f"JSON file '{json_filename}' does not exist. Prompting to create.")
            create = messagebox.askyesno("Create File", f"The file '{json_filename}' does not exist in 'srv_data'. Would you like to create it?")
            if create:
                try:
                    with open(json_file_path, "w", encoding="utf-8") as file:
                        json.dump([], file, indent=4, ensure_ascii=False)
                    logging.info(f"Created new JSON file: {json_filename}")
                    messagebox.showinfo("Success", f"Created new JSON file: {json_filename}")
                except Exception as e:
                    logging.error(f"Could not create JSON file '{json_file_path}': {e}")
                    messagebox.showerror("Error", f"Could not create JSON file: {str(e)}")
                    # Disable the Play Sound and Add Entry buttons due to error
                    play_button.config(state=tk.DISABLED)
                    add_button.config(state=tk.DISABLED)
                    logging.debug("Play Sound and Add Entry buttons disabled due to JSON creation error.")
                    return
            else:
                logging.info("User chose not to create a new JSON file.")
                return

        try:
            with open(json_file_path, "r", encoding="utf-8") as file:
                json_data = json.load(file)
            logging.info(f"Loaded JSON data from '{json_file_path}'.")

            # Validate that json_data is a list
            if not isinstance(json_data, list):
                logging.error(f"JSON file '{json_file_path}' does not contain a list of entries.")
                messagebox.showerror("Error", "JSON file does not contain a list of entries.")
                # Disable the Play Sound and Add Entry buttons since JSON is invalid
                play_button.config(state=tk.DISABLED)
                add_button.config(state=tk.DISABLED)
                logging.debug("Play Sound and Add Entry buttons disabled due to invalid JSON structure.")
                return

            current_category = selected_cat
            current_index = 0
            create_form(current_category, json_data, current_index)

            # Enable the Play Sound and Add Entry buttons since JSON is loaded
            play_button.config(state=tk.NORMAL)
            add_button.config(state=tk.NORMAL)
            logging.debug("Play Sound and Add Entry buttons enabled.")
        except json.JSONDecodeError as e:
            logging.error(f"JSON decoding error in file '{json_file_path}': {e}")
            messagebox.showerror("Error", f"JSON decoding error: {str(e)}")
            # Disable the Play Sound and Add Entry buttons due to error
            play_button.config(state=tk.DISABLED)
            add_button.config(state=tk.DISABLED)
            logging.debug("Play Sound and Add Entry buttons disabled due to JSON decoding error.")
        except Exception as e:
            logging.error(f"Could not open JSON file '{json_file_path}': {e}")
            messagebox.showerror("Error", f"Could not open JSON file: {str(e)}")
            # Disable the Play Sound and Add Entry buttons due to error
            play_button.config(state=tk.DISABLED)
            add_button.config(state=tk.DISABLED)
            logging.debug("Play Sound and Add Entry buttons disabled due to error.")

    # Function to open the Add Entry form
    def open_add_entry_form():
        logging.debug("Add Entry button clicked.")
        if not current_category:
            logging.warning("No category selected when attempting to add an entry.")
            messagebox.showwarning("Warning", "Please select a category before adding a new entry.")
            return
        create_form(current_category, json_data, current_index=None)
        logging.debug("Add Entry form displayed.")

    # Function to stop sound when window is closed
    def on_closing():
        nonlocal is_sound_playing
        logging.debug("Application is closing.")
        if is_sound_playing:
            pygame.mixer.music.stop()
            logging.info("Stopped playing sound on application close.")
        root.destroy()

    # Function to select category and automatically load JSON data
    def select_category(*args):
        selected = category_var.get()
        logging.debug(f"Selected category changed to: {selected}")
        if selected:
            # Automatically load the JSON file when a new category is selected
            open_json_file()
        else:
            for widget in form_frame.winfo_children():
                widget.destroy()
            # Disable the Play Sound and Add Entry buttons since no category is selected
            play_button.config(state=tk.DISABLED)
            add_button.config(state=tk.DISABLED)
            logging.debug("Play Sound and Add Entry buttons disabled because no category is selected.")
            logging.debug("No category selected; cleared the form.")

    # Create the GUI
    root = tk.Tk()
    root.title("Sound Library Manager")

    root.protocol("WM_DELETE_WINDOW", on_closing)

    # Category Selection Frame
    category_frame = tk.Frame(root)
    category_frame.grid(row=0, column=0, padx=10, pady=10, sticky="w")

    tk.Label(category_frame, text="Select Category:").pack(side=tk.LEFT)

    category_var = tk.StringVar()
    category_var.trace("w", select_category)  # Trace changes to update the form

    categories = list(CATEGORY_CONFIG.keys())

    category_menu = tk.OptionMenu(category_frame, category_var, *categories)
    category_menu.pack(side=tk.LEFT, padx=5)

    # Buttons Frame
    buttons_frame = tk.Frame(root)
    buttons_frame.grid(row=1, column=0, padx=10, pady=10, sticky="w")

    # Initialize the Play Sound button as disabled
    play_button = tk.Button(buttons_frame, text="Play Sound", command=play_sound, state=tk.DISABLED)
    play_button.pack(side=tk.LEFT, padx=5)
    logging.debug("Play Sound button initialized as disabled.")

    # Initialize the Add Entry button as disabled
    add_button = tk.Button(buttons_frame, text="Add Entry", command=open_add_entry_form, state=tk.DISABLED)
    add_button.pack(side=tk.LEFT, padx=5)
    logging.debug("Add Entry button initialized as disabled.")

    # Form Frame
    form_frame = tk.Frame(root)
    form_frame.grid(row=2, column=0, padx=10, pady=10)

    # Start the Tkinter event loop
    logging.debug("Starting Tkinter main loop.")
    root.mainloop()
    logging.debug("Tkinter main loop has ended.")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logging.exception("An unhandled exception occurred.")
        messagebox.showerror("Fatal Error", f"An unexpected error occurred: {e}")
        sys.exit(1)
