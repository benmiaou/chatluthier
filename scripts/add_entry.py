import tkinter as tk
from tkinter import filedialog, messagebox
import pygame
import json

pygame.mixer.init()
is_sound_playing = False

# Function to transform data to include tuples
def transform_data(data):
    for entry in data:
        if entry.get("types") and entry.get("contexts"):
            first_type = entry['types'][0]
            entry["contexts"] = [(first_type, context) for context in entry["contexts"]]
            del entry["types"]
    return data

# Function to play sound based on JSON data
def play_sound(json_file_path, json_data, current_index=0):
    global is_sound_playing
    if is_sound_playing:
        pygame.mixer.music.stop()
        is_sound_playing = False
        return
    
    if "ambiance" in json_file_path:
        base_path = "assets/ambiance/"
    elif "soundboard" in json_file_path:
        base_path = "assets/soundboard/"
    elif "background" in json_file_path:
        base_path = "assets/background/"
    else:
        base_path = ""

    if isinstance(json_data, list) and 0 <= current_index < len(json_data):
        current_data = json_data[current_index]
        filename = current_data.get("filename")
    else:
        filename = json_data.get("filename")
    
    if filename:
        sound_path = base_path + filename
        try:
            pygame.mixer.music.load(sound_path)
            pygame.mixer.music.play()
            is_sound_playing = True
        except Exception as e:
            messagebox.showerror("Error", f"Could not play sound: {str(e)}")
    else:
        messagebox.showerror("Error", "No filename specified in the JSON data")

# Function to create GUI form fields based on JSON keys and data types
def create_form(json_data, current_index=None):
    for widget in form_frame.winfo_children():
        widget.destroy()

    entry_widgets = {}
    if current_index is not None:
        current_entry = json_data[current_index]
        row = 0

        for key, value in current_entry.items():
            if isinstance(value, list):
                tk.Label(form_frame, text=f"{key.capitalize()} (comma-separated):").grid(row=row, column=0, sticky=tk.W)
                text_widget = tk.Text(form_frame, height=2, width=40)
                text_widget.insert(tk.END, ", ".join([f"{v[0]} - {v[1]}" for v in value]))
                text_widget.grid(row=row, column=1, padx=10, pady=10, sticky="ew")
                entry_widgets[key] = text_widget
            else:
                tk.Label(form_frame, text=f"{key.capitalize()}:").grid(row=row, column=0, sticky=tk.W)
                entry_widget = tk.Entry(form_frame, width=40)
                entry_widget.insert(0, str(value))
                entry_widget.grid(row=row, column=1, padx=10, pady=10, sticky="ew")
                entry_widgets[key] = entry_widget
            row += 1

        if current_index > 0:
            tk.Button(form_frame, text="Previous", command=lambda: navigate(-1)).grid(row=row, column=0, padx=10, pady=10)
        if current_index < len(json_data) - 1:
            tk.Button(form_frame, text="Next", command=lambda: navigate(1)).grid(row=row, column=1, padx=10, pady=10)

        tk.Button(form_frame, text="Update Entry", command=lambda: update_entry(entry_widgets, json_data, current_index)).grid(row=row + 1, column=0, columnspan=2, padx=10, pady=10)
    
    else:
        first_entry = json_data[0]
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

        tk.Button(form_frame, text="Add Entry", command=lambda: add_entry(entry_widgets, json_data)).grid(row=row, column=0, columnspan=2, padx=10, pady=10)

    return entry_widgets

# Function to add a new entry to the JSON file
def add_entry(entry_widgets, json_data):
    new_entry = {}
    for key, widget in entry_widgets.items():
        if isinstance(widget, tk.Text):
            text_content = widget.get("1.0", tk.END).strip()
            if key == "contexts":
                new_entry[key] = [tuple(item.strip().split(" - ")) for item in text_content.split(",")]
            else:
                new_entry[key] = [item.strip() for item in text_content.split(",")]
        else:
            new_entry[key] = widget.get()

    json_data.append(new_entry)

    with open(json_file_path, "w") as file:
        json.dump(json_data, file, indent=4)

    messagebox.showinfo("Success", "New entry added successfully!")
    create_form(json_data)

# Function to update an existing entry in the JSON file
def update_entry(entry_widgets, json_data, current_index):
    updated_entry = {}
    for key, widget in entry_widgets.items():
        if isinstance(widget, tk.Text):
            text_content = widget.get("1.0", tk.END).strip()
            if key == "contexts":
                updated_entry[key] = [tuple(item.strip().split(" - ")) for item in text_content.split(",")]
            else:
                updated_entry[key] = [item.strip() for item in text_content.split(",")]
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
        
        json_data = transform_data(json_data)
        current_index = 0
        create_form(json_data, current_index)
    
    except Exception as e:
        messagebox.showerror("Error", f"Could not open JSON file: {str(e)}")

# Create the GUI
root = tk.Tk()
root.title("Edit JSON Data")

form_frame = tk.Frame(root)
form_frame.grid(row=1, column=0, padx=10, pady=10)

tk.Button(root, text="Open JSON File", command=open_json_file).grid(row=0, column=0, padx=10, pady=10)
tk.Button(root, text="Create New Entry", command=lambda: create_form(json_data)).grid(row=0, column=1, padx=10, pady=10)
tk.Button(root, text="Play Sound", command=lambda: play_sound(json_file_path, json_data, current_index)).grid(row=0, column=2, padx=10, pady=10)

root.mainloop()
