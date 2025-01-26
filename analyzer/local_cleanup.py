from datetime import datetime
import time
import json
import os

def get_file_creation_date(file_path):
    """Get file's creation date in epoch seconds."""
    if not os.path.exists(file_path):
        return None
    
    creation_time = os.path.getctime(file_path)
    return creation_time

def get_size_mb(path):
    """Calculate directory or file size in megabytes."""
    if not os.path.exists(path):
        return 0
    
    if os.path.isfile(path):
        return os.path.getsize(path) / (1024 * 1024)
    
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if not os.path.islink(fp):
                total_size += os.path.getsize(fp)
    
    return total_size / (1024 * 1024)


current_epoch_seconds = time.time()
pdfs_directory_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pdfs/")
directory_path = pdfs_directory_path
for file_name in os.listdir(directory_path):
    file_path = os.path.join(directory_path, file_name)
    if os.path.isfile(file_path) and file_path.endswith(".pdf"):
        file_date_created = get_file_creation_date(file_path)
        if abs(file_date_created - current_epoch_seconds) >= (24 * 60 * 60): # delete files older then 24 hours
            os.remove(file_path)


log_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "analyzer.log")
if os.path.isfile(log_file_path):
    if get_size_mb(log_file_path) > (5 * 1024):  # 1 GB = 1024 MB
        with open(log_file_path, 'r') as file:
            lines = file.readlines()
        
        num_lines = len(lines)
        lines_to_remove = num_lines // 3  # Calculate one-third of the lines
        
        with open(log_file_path, 'w') as file:
            file.writelines(lines[lines_to_remove:])  # Write remaining lines
        
        print(f"Trimmed top {lines_to_remove} lines from the log file.")