import tkinter as tk
from tkinter import filedialog, messagebox
import json
import os

# Function to dynamically create GUI form fields based on JSON keys and data types
def create_form(json_data):
    # Clear any existing content in the form_frame
    for widget in form_frame.winfo_children():
        widget.destroy()

    # Get the keys from the first JSON object and determine their types
    json_keys = json_data[0].keys()

    # Create a dictionary to store different types of input widgets
    entry_widgets = {}

    # Create entry fields based on data type
    row = 0
    for key in json_keys:
        expected_value = json_data[0][key]  # Get the expected type from the first object
        
        # Determine if the field is a string or an array
        if isinstance(expected_value, list):
            tk.Label(form_frame, text=f"{key.capitalize()} (comma-separated):").grid(row=row, column=0, sticky=tk.W)
            text_widget = tk.Text(form_frame, height=2, width=20)  # Use Text for arrays
            text_widget.grid(row=row, column=1, padx=10, pady=10)
            entry_widgets[key] = text_widget
        else:
            tk.Label(form_frame, text=f"{key.capitalize()}:").grid(row=row, column=0, sticky=tk.W)
            entry_widget = tk.Entry(form_frame)
            entry_widget.grid(row=row, column=1, padx=10, pady=10)
            entry_widgets[key] = entry_widget
        
        row += 1

    # Button to add the new entry
    tk.Button(form_frame, text="Add Entry", command=lambda: add_entry(entry_widgets, json_data)).grid(row=row, column=0, columnspan=2, padx=10, pady=10)

    return entry_widgets

# Function to add a new entry to the JSON file
def add_entry(entry_widgets, json_data):
    # Create a new entry based on the form field values
    new_entry = {}
    for key, widget in entry_widgets.items():
        if isinstance(widget, tk.Text):  # Handle array input
            text_content = widget.get("1.0", tk.END).strip()  # Get content from Text widget
            new_entry[key] = [item.strip() for item in text_content.split(",")]  # Convert to list
        else:
            new_entry[key] = widget.get()

    # Append the new entry and save it back to the JSON file
    json_data.append(new_entry)
    with open(json_file_path, "w") as file:
        json.dump(json_data, file, indent=4)

    # Clear the entry fields and display a success message
    for widget in entry_widgets.values():
        if isinstance(widget, tk.Text):
            widget.delete("1.0", tk.END)
        else:
            widget.delete(0, tk.END)
    
    messagebox.showinfo("Success", "Entry added successfully!")

# Function to open a JSON file
def open_json_file():
    global json_file_path  # Keep track of the current JSON file path
    json_file_path = filedialog.askopenfilename(title="Select JSON File", filetypes=[("JSON Files", "*.json")])

    if not json_file_path:
        return  # If no file is selected, return
    
    try:
        with open(json_file_path, "r") as file:
            json_data = json.load(file)
        
        create_form(json_data)  # Create the form based on the JSON data
    
    except Exception as e:
        messagebox.showerror("Error", f"Could not open JSON file: {str(e)}")

# Create the GUI
root = tk.Tk()
root.title("Add data")

# Frame to hold the form fields
form_frame = tk.Frame(root)
form_frame.grid(row=1, column=0, padx=10, pady=10)

# Button to open a JSON file
tk.Button(root, text="Open JSON File", command=open_json_file).grid(row=0, column=0, padx=10, pady=10)

# Start the GUI
root.mainloop()