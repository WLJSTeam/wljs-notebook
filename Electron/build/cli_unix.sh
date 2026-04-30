#!/bin/bash

# Check if both arguments are provided
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Error: Insufficient arguments provided."
  echo "Usage: $0 <directory_path> <app_path>"
  exit 1
fi

# Resolve the absolute path of the provided directory
target_dir=$(realpath "$1")

# Check if the directory exists
if [ ! -d "$target_dir" ]; then
  echo "Error: Directory '$target_dir' does not exist."
  exit 1
fi

# Set the application path from the second argument (resolve to absolute path)
app_path=$(realpath "$2")

# Define the target file path
file_path="$target_dir/wljs"

# Write the required content to wljs
cat << EOF > "$file_path"
#!/bin/bash

APP_PATH="$app_path"

urlencode() {
  echo -n "\$1" | xxd -plain | tr -d '\\n' | sed 's/../%&/g' | tr 'a-f' 'A-F'
}

# Case 1: wljs .
if [ "\$#" -eq 1 ] && [ "\$1" = "." ]; then
  TARGET_PATH="\$(realpath ".")"
  "\$APP_PATH" "\$TARGET_PATH"

# Case 3: passthrough
else
  "\$APP_PATH" --cli "\$@"
fi
EOF

# Make the file executable
chmod +x "$file_path"

# Confirm file creation
if [ -f "$file_path" ]; then
  echo "File created at: $file_path"
else
  echo "Error: Could not create file."
fi