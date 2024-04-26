import tkinter as tk
from tkinter import filedialog, messagebox
import pygame  # Library for sound and multimedia handling
import json

pygame.mixer.init()  # Initialize the mixer module for sound playback
is_sound_playing = False

# Function to play sound based on JSON data
def play_sound(json_file_path, json_data, current_index=0):
    global is_sound_playing  # Track sound state
    if is_sound_playing:  # If sound is playing, stop it
        pygame.mixer.music.stop()  # Stop the current sound
        is_sound_playing = False  # Update the flag
        return
    # Determine the correct base path based on the JSON file name
    if "ambiance" in json_file_path:
        base_path = "assets/ambiance/"
    elif "soundboard" in json_file_path:
        base_path = "assets/soundboard/"
    elif "background" in json_file_path:
        base_path = "assets/background/"
    else:
        base_path = ""

    # Access the current index or use a fallback mechanism
    if isinstance(json_data, list):
        # Ensure the index is within range
        if 0 <= current_index < len(json_data):
            current_data = json_data[current_index]  # Get the correct dictionary
            filename = current_data.get("filename", None)  # Get the filename key
        else:
            filename = None  # If index is out of range
    else:
        filename = json_data.get("filename", None)  # If json_data is not a list
    
    if filename:
        sound_path = base_path + filename
        try:
            pygame.mixer.music.load(sound_path)  # Load the sound
            pygame.mixer.music.play()  # Play the sound
            is_sound_playing = True  # Update the flag
        except Exception as e:
            messagebox.showerror("Error", f"Could not play sound: {str(e)}")
    else:
        messagebox.showerror("Error", "No filename specified in the JSON data")


# Function to create GUI form fields based on JSON keys and data types
def create_form(json_data, current_index=None):
    # Clear any existing content in the form_frame
    for widget in form_frame.winfo_children():
        widget.destroy()

    entry_widgets = {}

    # Determine if we're creating a new entry or editing an existing one
    if current_index is not None:
        # We're editing an existing entry
        current_entry = json_data[current_index]
        row = 0

        for key, value in current_entry.items():
            if isinstance(value, list):
                tk.Label(form_frame, text=f"{key.capitalize()} (comma-separated):").grid(row=row, column=0, sticky=tk.W)
                text_widget = tk.Text(form_frame, height=2, width=40)
                text_widget.insert(tk.END, ", ".join(value))
                text_widget.grid(row=row, column=1, padx=10, pady=10, sticky="ew")  
                entry_widgets[key] = text_widget
            else:
                tk.Label(form_frame, text=f"{key.capitalize()}:").grid(row=row, column=0, sticky=tk.W)
                entry_widget = tk.Entry(form_frame, width=40)
                entry_widget.insert(0, str(value))
                entry_widget.grid(row=row, column=1, padx=10, pady=10, sticky="ew")  
                entry_widgets[key] = entry_widget
            row += 1

        # Navigation buttons
        if current_index > 0:
            tk.Button(form_frame, text="Previous", command=lambda: navigate(-1)).grid(row=row, column=0, padx=10, pady=10)
        if current_index < len(json_data) - 1:
            tk.Button(form_frame, text="Next", command=lambda: navigate(1)).grid(row=row, column=1, padx=10, pady=10)

        # Button to update the current entry
        tk.Button(form_frame, text="Update Entry", command=lambda: update_entry(entry_widgets, json_data, current_index)).grid(row=row + 1, column=0, columnspan=2, padx=10, pady=10)
    
    else:
        # We're creating a new entry
        first_entry = json_data[0]  # Use the first entry to create the structure
        row = 0

        for key in first_entry.keys():
            tk.Label(form_frame, text=f"{key.capitalize()}:").grid(row=row, column=0, sticky=tk.W)
            if isinstance(first_entry[key], list):
                text_widget = tk.Text(form_frame, height=2, width=20)
                text_widget.grid(row=row, column=1, padx=10, pady=10)
                entry_widgets[key] = text_widget
            else:
                entry_widget = tk.Entry(form_frame)
                entry_widget.grid(row=row, column=1, padx=10, pady=10)
                entry_widgets[key] = entry_widget
            row += 1

        # Button to add the new entry
        tk.Button(form_frame, text="Add Entry", command=lambda: add_entry(entry_widgets, json_data)).grid(row=row, column=0, columnspan=2, padx=10, pady=10)

    return entry_widgets

# Function to add a new entry to the JSON file
def add_entry(entry_widgets, json_data):
    new_entry = {}

    for key, widget in entry_widgets.items():
        if isinstance(widget, tk.Text):
            text_content = widget.get("1.0", tk.END).strip()
            new_entry[key] = [item.strip() for item in text_content.split(",")]
        else:
            new_entry[key] = widget.get()

    json_data.append(new_entry)

    with open(json_file_path, "w") as file:
        json.dump(json_data, file, indent=4)

    messagebox.showinfo("Success", "New entry added successfully!")

    # Reset the form
    create_form(json_data)

# Function to update an existing entry in the JSON file
def update_entry(entry_widgets, json_data, current_index):
    updated_entry = {}

    for key, widget in entry_widgets.items():
        if isinstance(widget, tk.Text):
            text_content = widget.get("1.0", tk.END).strip()
            updated_entry[key] = [item.strip() for item in text_content.split(",")]  # Corrected here
        else:
            updated_entry[key] = widget.get()

    json_data[current_index] = updated_entry
    
    with open(json_file_path, "w") as file:
        json.dump(json_data, file, indent=4)

    messagebox.showinfo("Success", "Entry updated successfully!")

# Function to navigate through the JSON entries
def navigate(direction):
    global current_index
    current_index += direction
    create_form(json_data, current_index)

# Function to open a JSON file
def open_json_file():
    global json_file_path
    global json_data
    global current_index

    json_file_path = filedialog.askopenfilename(title="Select JSON File", filetypes=[("JSON Files", "*.json")])

    if not json_file_path:
        return

    try:
        with open(json_file_path, "r") as file:
            json_data = json.load(file)
        
        current_index = 0  # Reset current index
        create_form(json_data, current_index)
    
    except Exception as e:
        messagebox.showerror("Error", f"Could not open JSON file: {str(e)}")

# Create the GUI
root = tk.Tk()
root.title("Edit JSON Data")

# Frame to hold the form fields
form_frame = tk.Frame(root)
form_frame.grid(row=1, column=0, padx=10, pady=10)

# Button to open a JSON file
tk.Button(root, text="Open JSON File", command=open_json_file).grid(row=0, column=0, padx=10, pady=10)

# Button to create a new entry
tk.Button(root, text="Create New Entry", command=lambda: create_form(json_data)).grid(row=0, column=1, padx=10, pady=10)

# Button to play sound based on the loaded JSON file
tk.Button(root, text="Play Sound", command=lambda: play_sound(json_file_path, json_data, current_index)).grid(row=0, column=2, padx=10, pady=10)

# Start the GUI
root.mainloop()
