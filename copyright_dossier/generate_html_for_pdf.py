#!/usr/bin/env python3
import os
import re

DOSSIER_DIR = os.path.dirname(os.path.abspath(__file__))

HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>
  @page {{
    size: A4;
    margin: 20mm 15mm 20mm 15mm;
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #111;
    line-height: 1.5;
    padding: 30px;
    max-width: 900px;
    margin: 0 auto;
  }}
  h1, h2, h3 {{
    color: #0b192c;
    border-bottom: 2px solid #eaeaea;
    padding-bottom: 6px;
  }}
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 13px;
  }}
  th, td {{
    border: 1px solid #ccc;
    padding: 8px 12px;
    text-align: left;
  }}
  th {{
    background: #f4f6f8;
  }}
  pre {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 11px;
    overflow-x: auto;
    page-break-inside: avoid;
    white-space: pre-wrap;
    word-break: break-all;
  }}
  code {{
    font-family: "SFMono-Regular", Consolas, monospace;
    font-size: 12px;
    background: #f1f5f9;
    padding: 2px 4px;
    border-radius: 4px;
  }}
  blockquote {{
    border-left: 4px solid #00f0ff;
    padding-left: 14px;
    color: #475569;
    font-style: italic;
  }}
  @media print {{
    body {{ padding: 0; }}
    pre {{ page-break-inside: avoid; }}
  }}
</style>
</head>
<body>
{body}
</body>
</html>
"""

def md_to_html_simple(md_text):
    # Escape HTML
    lines = md_text.split('\n')
    html_lines = []
    in_code_block = False
    in_table = False

    for line in lines:
        if line.startswith('```'):
            if in_code_block:
                html_lines.append('</pre>')
                in_code_block = False
            else:
                html_lines.append('<pre>')
                in_code_block = True
            continue

        if in_code_block:
            safe_line = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            html_lines.append(safe_line)
            continue

        # Headers
        if line.startswith('# '):
            html_lines.append(f'<h1>{line[2:]}</h1>')
        elif line.startswith('## '):
            html_lines.append(f'<h2>{line[3:]}</h2>')
        elif line.startswith('### '):
            html_lines.append(f'<h3>{line[4:]}</h3>')
        elif line.startswith('> '):
            html_lines.append(f'<blockquote>{line[2:]}</blockquote>')
        elif line.startswith('|') and line.endswith('|'):
            if '---' in line:
                continue
            cells = [c.strip() for c in line.split('|')[1:-1]]
            tag = 'th' if not in_table else 'td'
            if not in_table:
                html_lines.append('<table><thead><tr>')
                in_table = True
            else:
                html_lines.append('<tr>')
            for cell in cells:
                # bold
                cell = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', cell)
                html_lines.append(f'<{tag}>{cell}</{tag}>')
            html_lines.append('</tr>')
            if tag == 'th':
                html_lines.append('</thead><tbody>')
        else:
            if in_table:
                html_lines.append('</tbody></table>')
                in_table = False
            if line.strip():
                # bold
                l = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', line)
                html_lines.append(f'<p>{l}</p>')

    if in_table:
        html_lines.append('</tbody></table>')
    if in_code_block:
        html_lines.append('</pre>')

    return '\n'.join(html_lines)

for fname in ['1_FORM_XIV_APPLICATION_DETAILS.md', '2_STATEMENT_OF_OPERATION.md', '3_SOURCE_CODE_EXTRACT.md', '4_FILING_GUIDE_STEP_BY_STEP.md']:
    fpath = os.path.join(DOSSIER_DIR, fname)
    if os.path.exists(fpath):
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        body = md_to_html_simple(content)
        title = fname.replace('.md', '').replace('_', ' ')
        html = HTML_TEMPLATE.format(title=title, body=body)
        outpath = os.path.join(DOSSIER_DIR, fname.replace('.md', '.html'))
        with open(outpath, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"Generated printable HTML: {outpath}")
