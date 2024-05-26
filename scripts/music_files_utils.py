import json


def add_key_to_music_file(source_file: str, key: str, value):
    f = open(source_file, 'r')
    file_data_dict = json.load(f)
    for el in file_data_dict:
        el[key] = value
    f.close()
    f = open(source_file, 'w')
    json.dump(file_data_dict, f, ensure_ascii=False, indent=4)
    f.close()

if __name__ == '__main__':
    add_key_to_music_file('../backgroundMusic.json', 'isEnabled', True)