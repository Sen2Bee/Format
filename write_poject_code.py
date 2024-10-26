import os
import datetime

# Define the path to the root folder (current folder as default)
root_path = os.getcwd()

# Output file to store all content
output_file = os.path.join(root_path, 'code.txt')

# Define text-based file extensions to include
text_extensions = {
    '.py', 
    '.html', 
    '.css', 
    '.js'
    }

# Define directories and files to include
included_dirs = {'static', 'templates'}
included_files = {}#{'app.py', 'db_structure.txt'}

# Define directories to exclude
excluded_dirs = {'venv'}

# Get the current timestamp
timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# Function to create folder structure and add content from files
def create_code_summary(root_path, output_file, timestamp):
    with open(output_file, 'w', encoding='utf-8') as output:
        # Step 1: Write the timestamp as a header
        output.write(f"=== Code Summary Generated at {timestamp} ===\n\n")

        # Step 2: Write folder structure as a header
        output.write("=== Project Folder Structure ===\n\n")

        for root, dirs, files in os.walk(root_path):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if d not in excluded_dirs]

            # Check if the directory should be included (root, static, or templates)
            relative_root = os.path.relpath(root, root_path)

            if root == root_path or any(included_dir in relative_root.split(os.sep) for included_dir in included_dirs):
                # Write the directory structure
                level = root.replace(root_path, "").count(os.sep)
                indent = ' ' * 4 * level
                output.write(f"{indent}{os.path.basename(root)}/\n")

                sub_indent = ' ' * 4 * (level + 1)
                for filename in files:
                    # Include specific files in root directory or files in the included directories
                    if (root == root_path and filename in included_files) or (any(included_dir in relative_root.split(os.sep) for included_dir in included_dirs)):
                        output.write(f"{sub_indent}{filename}\n")

        # Step 3: Append file contents with headers
        output.write("\n=== File Contents ===\n\n")
        for root, dirs, files in os.walk(root_path):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if d not in excluded_dirs]

            # Check if the directory should be included
            relative_root = os.path.relpath(root, root_path)

            if root == root_path or any(included_dir in relative_root.split(os.sep) for included_dir in included_dirs):
                for filename in files:
                    # Get the full file path
                    file_path = os.path.join(root, filename)
                    # Get the file extension
                    _, extension = os.path.splitext(filename)

                    # Check if the file has a text-based extension and is within the included directories or is a special included file in the root
                    if ((root == root_path and filename in included_files) or (any(included_dir in relative_root.split(os.sep) for included_dir in included_dirs))) and extension in text_extensions:
                        # Write file header to the output
                        relative_path = os.path.relpath(file_path, root_path)
                        output.write(f"--- File: {relative_path} ---\n")

                        # Read and write the file content
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                                output.write(content + "\n")
                        except Exception:
                            output.write(f"Error reading file: {relative_path}\n")

# Run the function to create the summary with the timestamp
create_code_summary(root_path, output_file, timestamp)
