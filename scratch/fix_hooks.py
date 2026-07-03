import os
import re

src_dir = r'd:\Script_v10\webscriptv10-restored\frontend\src'

def fix_early_returns(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Move early returns `if (loading)` or `if (!data)` below hooks
    # Typically, early returns in these files look like:
    # `if (loading) return ...`
    # `if (!data) return ...`
    # Let's find them
    loading_pattern = re.compile(r'(  if \((loading|!data|!user)\) return .*?;\n)', re.DOTALL)
    matches = list(loading_pattern.finditer(content))
    
    if matches:
        early_returns = ""
        for m in matches:
            early_returns += m.group(1)
            content = content.replace(m.group(1), "")
            
        # Find where to insert the early returns: right before the main return statement `  return (`
        insert_pos = content.find('  return (')
        if insert_pos != -1:
            content = content[:insert_pos] + early_returns + '\n' + content[insert_pos:]
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            fix_early_returns(os.path.join(root, file))

print("Early returns fixed.")
