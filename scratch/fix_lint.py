import os
import re

src_dir = r'd:\Script_v10\webscriptv10-restored\frontend\src'

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove 'import React, ' or 'import React '
    content = re.sub(r'import React,\s*\{', 'import {', content)
    content = re.sub(r'import React\s+from\s+[\'"]react[\'"];\n', '', content)
    
    # 2. Fix the hoisted async function issue by moving the fetch definition above useEffect
    # We will search for useEffect(() => { fetchX(); }, []); and the async function fetchX() { ... }
    # and swap them.
    
    # Find useEffect blocks that just call a fetch function
    use_effect_pattern = re.compile(r'(  useEffect\(\(\) => \{\n\s+([a-zA-Z0-9_]+)\(\);\n\s+\}, \[\]\);\n)')
    match = use_effect_pattern.search(content)
    
    if match:
        effect_block = match.group(1)
        func_name = match.group(2)
        
        # Find the function definition
        func_pattern = re.compile(r'(  async function ' + func_name + r'\(\) \{.*?\n  \};\n)', re.DOTALL)
        func_match = func_pattern.search(content)
        
        if func_match:
            func_block = func_match.group(1)
            # Remove both from original
            content = content.replace(effect_block, '')
            
            # Replace func_block with fixed version (remove trailing semicolon)
            fixed_func_block = func_block.rstrip().rstrip(';') + '\n'
            content = content.replace(func_block, '')
            
            # Now insert them back: function first, then useEffect
            # Find the start of the component body (e.g. `const [..., ...] = useState(...)`)
            # We'll just insert them right before the return statement or after the last useState
            
            insert_pos = content.find('  return (')
            if insert_pos == -1:
                insert_pos = content.find('  if (loading)')
            
            if insert_pos != -1:
                content = content[:insert_pos] + fixed_func_block + '\n' + effect_block + '\n' + content[insert_pos:]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            fix_file(os.path.join(root, file))

print("Lint fix script executed.")
