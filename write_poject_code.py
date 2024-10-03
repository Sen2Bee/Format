import os

# Define the path to the root folder (current folder as default)
root_path = os.getcwd()

# Output file to store all content
output_file = os.path.join(root_path, 'code.txt')

# Define text-based file extensions to include
text_extensions = { 
    '.py', 
    '.html', 
    '.css', 
    '.js'}#, '.md', '.json', '.csv', '.txt',

# Define directories to exclude
excluded_dirs = {'venv'}

# Function to create folder structure and add content from files
def create_code_summary(root_path, output_file):
    with open(output_file, 'w', encoding='utf-8') as output:
        # Step 1: Write folder structure as a header
        output.write("=== Project Folder Structure ===\n\n")
        for root, dirs, files in os.walk(root_path):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if d not in excluded_dirs]
            
            level = root.replace(root_path, "").count(os.sep)
            indent = ' ' * 4 * level
            output.write(f"{indent}{os.path.basename(root)}/\n")
            sub_indent = ' ' * 4 * (level + 1)
            for filename in files:
                output.write(f"{sub_indent}{filename}\n")

        # Step 2: Append file contents with headers
        output.write("\n=== File Contents ===\n\n")
        for root, dirs, files in os.walk(root_path):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if d not in excluded_dirs]

            for filename in files:
                # Get the full file path
                file_path = os.path.join(root, filename)
                # Get the file extension
                _, extension = os.path.splitext(filename)
                # Check if the file has a text-based extension
                if extension in text_extensions:
                    # Write file header to the output
                    relative_path = os.path.relpath(file_path, root_path)
                    output.write(f"\n--- File: {relative_path} ---\n\n")

                    # Read the content of the file and write it to the output file
                    try:
                        with open(file_path, 'r', encoding='utf-8') as file_content:
                            content = file_content.read()
                            output.write(content + "\n\n")
                    except Exception as e:
                        output.write(f"Error reading {relative_path}: {e}\n\n")

    print(f"Project summary written to {output_file}")

# Run the script
create_code_summary(root_path, output_file)
